/**
 * CRM Report Email Ingestion
 *
 * This module provides functionality to fetch CRM reports delivered via scheduled email
 * before falling back to Playwright automation. It connects to a mailbox, scans for
 * new messages, downloads attachments, and returns the file path.
 *
 * Enhanced with retry and circuit breaker patterns for improved reliability.
 */
import * as fs from 'fs';
import { isError } from '../utils/errorUtils.js';
import * as path from 'path';
import { promisify } from 'util';
import * as imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { CRMPlatform } from '../types.js';
import { retry } from '../utils/retry.js';
import { CircuitBreaker } from '../utils/circuitBreaker.js';
import { logger } from '../shared/logger.js';
// Create directories if they don't exist
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
/**
 * Circuit breaker for IMAP operations
 */
const imapCircuitBreaker = new CircuitBreaker('imap-report-operations', {
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  inMemory: true,
  onStateChange: (from, to) => {
    logger.info(`IMAP report circuit breaker state changed from ${from} to ${to}`);
  },
});
/**
 * Custom error for when no report is found in the email
 */
export class ReportNotFoundError extends Error {
  constructor(message = 'No scheduled report emails found') {
    super(message);
    this.name = 'ReportNotFoundError';
  }
}
/**
 * Configuration for IMAP connection
 */
interface IMAPConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  authTimeout?: number;
}
/**
 * Gets the IMAP configuration from environment variables
 * @returns IMAP configuration object
 * @throws Error if required environment variables are not set
 */
function getIMAPConfig(): IMAPConfig {
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 993;
  const tls = process.env.EMAIL_TLS !== 'false';
  if (!user || !password || !host) {
    throw new Error('Missing required email configuration environment variables');
  }
  return {
    user,
    password,
    host,
    port,
    tls,
    authTimeout: 10000, // 10 seconds timeout
  };
}
/**
 * Gets search criteria for finding platform-specific emails
 * @param platform CRM platform name (e.g., 'VinSolutions')
 * @returns IMAP search criteria
 */
function getSearchCriteria(platform: string): any[] {
  // Map of platforms to their email domains or sender addresses
  const platformSenders: Record<string, string> = {
    VinSolutions: 'no-reply@vinsolutions.com',
    VAUTO: 'noreply@vauto.com',
    // Add more platforms as needed
  };
  const sender = platformSenders[platform] || '';
  return [
    'UNSEEN', // Only get unread messages
    ['FROM', sender],
  ];
}
/**
 * Fetches CRM reports from scheduled emails with retry and circuit breaker
 * @param platform The CRM platform (e.g., 'VinSolutions')
 * @param downloadDir Directory to save attachments to
 * @returns Path to the downloaded file, or null if none found
 * @throws ReportNotFoundError if no matching emails are found
 */
export async function ingestScheduledReport(
  platform: string,
  downloadDir: string
): Promise<string> {
  logger.info(`📬 Checking emails for ${platform} reports...`);
  // Ensure download directory exists
  await mkdir(downloadDir, { recursive: true });
  try {
    // Use circuit breaker to protect IMAP operations
    return await imapCircuitBreaker.execute(async () => {
      // Use retry for the entire IMAP operation
      return await retry(
        async () => {
          const config = getIMAPConfig();
          let connection: imaps.ImapSimple | null = null;
          try {
            // Connect to mailbox
            logger.info(`Connecting to ${config.host}:${config.port} as ${config.user}...`);
            connection = await imaps.connect({
              imap: config,
            });
            // Open inbox
            await connection.openBox('INBOX');
            logger.info('Successfully opened INBOX');
            // Search for relevant emails
            const searchCriteria = getSearchCriteria(platform);
            logger.info(`Searching for emails matching criteria:`, { criteria: searchCriteria });
            const results = await connection.search(searchCriteria, {
              bodies: ['HEADER', 'TEXT', ''],
              markSeen: false,
            });
            logger.info(`Found ${results.length} matching emails`);
            if (results.length === 0) {
              throw new ReportNotFoundError(`No emails found from ${platform} platform`);
            }
            // Process each email
            for (const email of results) {
              // Get email message
              const all = email.parts.find((part) => part.which === '');
              if (!all) continue;
              // Parse email
              const parsed = await simpleParser(all.body);
              logger.info(`Processing email: ${parsed.subject}`);
              // Check for attachments
              if (!parsed.attachments || parsed.attachments.length === 0) {
                logger.info('No attachments found in this email');
                continue;
              }
              // Process attachments
              for (let i = 0; i < parsed.attachments.length; i++) {
                const attachment = parsed.attachments[i];
                // Generate a unique filename
                const timestamp = Date.now();
                const originalFilename = attachment.filename || `attachment_${i}.csv`;
                const filename = `${platform}_${timestamp}_${originalFilename}`;
                const filePath = path.join(downloadDir, filename);
                // Save attachment with retry
                logger.info(`Saving attachment to ${filePath}`);
                await retry(async () => writeFile(filePath, attachment.content), {
                  retries: 3,
                  minTimeout: 1000,
                  factor: 2,
                  jitter: true,
                  onRetry: (error, attempt) => {
                    logger.warn(`Retry attempt ${attempt} saving attachment:`, {
                      error: error?.message || String(error),
                      filePath,
                    });
                  },
                });
                // Mark the email as seen with retry
                await retry(async () => connection!.addFlags(email.attributes.uid, 'Seen'), {
                  retries: 2,
                  minTimeout: 1000,
                  factor: 2,
                });
                logger.info(`Successfully processed email and saved attachment to ${filePath}`);
                // Return the first saved file path
                return filePath;
              }
            }
            // If we got here, none of the emails had valid attachments
            throw new ReportNotFoundError('No valid attachments found in emails');
          } catch (error) {
            if (error instanceof ReportNotFoundError) {
              throw error; // Don't retry for ReportNotFoundError
            }
            logger.error('Error processing emails:', error);
            throw new Error(
              `Failed to process emails: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
            );
          } finally {
            // Close the connection in the finally block to ensure it happens
            if (connection) {
              try {
                await connection.end();
                logger.info('IMAP connection closed');
              } catch (err) {
                logger.error('Error closing IMAP connection:', err);
              }
            }
          }
        },
        {
          retries: 3,
          minTimeout: 2000,
          factor: 2,
          jitter: true,
          retryIf: (error) => {
            // Don't retry if it's a ReportNotFoundError
            if (error instanceof ReportNotFoundError) {
              return false;
            }
            // Retry on network errors, authentication issues, or other transient errors
            const errorMsg = error?.message?.toLowerCase() || '';
            return (
              errorMsg.includes('network') ||
              errorMsg.includes('connection') ||
              errorMsg.includes('timeout') ||
              errorMsg.includes('authentication') ||
              errorMsg.includes('econnrefused') ||
              errorMsg.includes('enotfound')
            );
          },
          onRetry: (error, attempt) => {
            logger.warn(`IMAP operation retry attempt ${attempt}:`, {
              error: error?.message || String(error),
              platform,
            });
          },
        }
      );
    });
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    // Handle circuit breaker errors
    if (error.name === 'CircuitOpenError') {
      logger.warn(
        `IMAP circuit is open: ${isError(error) ? (error instanceof Error ? (isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error) : String(error)) : String(error)) : String(error)) : String(error)}`
      );
      throw new Error(`Email service is currently unavailable. Please try again later.`);
    }
    // Rethrow other errors
    throw error;
  }
}
/**
 * Attempts to fetch a CRM report for the specified platform from emails
 * Falls back to null if the environment isn't configured for email access
 * Enhanced with retry for improved reliability
 *
 * @param platform CRM platform identifier
 * @returns Path to the report file or null if not found
 */
export async function tryFetchReportFromEmail(platform: CRMPlatform): Promise<string | null> {
  const isEmailConfigured = !!(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_HOST
  );
  if (!isEmailConfigured) {
    logger.info('Email credentials not configured, skipping email ingestion');
    return null;
  }
  try {
    // Default download directory
    const downloadDir = process.env.DOWNLOAD_DIR || './downloads';
    // Attempt to fetch report from email with retry
    // Note: ingestScheduledReport already has internal retry and circuit breaker
    // This is an additional layer for the overall operation
    const filePath = await ingestScheduledReport(platform, downloadDir);
    return filePath;
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    if (error instanceof ReportNotFoundError) {
      logger.info('No reports found in email:', {
        message: isError(error)
          ? error instanceof Error
            ? isError(error)
              ? error instanceof Error
                ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
                : String(error)
              : String(error)
            : String(error)
          : String(error),
      });
      return null;
    } else if (
      error.name === 'CircuitOpenError' ||
      (error instanceof Error
        ? error instanceof Error
          ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
          : String(error)
        : String(error)
      ).includes('currently unavailable')
    ) {
      logger.warn('Email service circuit is open, skipping email ingestion');
      return null;
    }
    logger.error('Error fetching report from email:', error);
    return null;
  }
}
