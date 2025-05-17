/**
 * IMAP Ingestion Service
 *
 * Enhanced service for retrieving CRM reports via email using IMAP.
 * Features:
 * - Dynamic search criteria from database
 * - Pagination support with batched message fetching
 * - Multiple attachment processing with deduplication
 * - Reconnect logic with exponential backoff and circuit breaker
 * - Health check monitoring with alerts
 * - Rate limiting and backpressure handling
 * - Advanced error recovery with failed email archiving
 */
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../shared/db.js';
import { imapFilters, healthChecks, failedEmails, emailQueue } from '../../../../shared/schema.js';
import { eq, and, desc, lte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { retry } from '../../../../utils/retry.js';
import { CircuitBreaker } from '../../../../utils/circuitBreaker.js';
import { logger } from '../../../../shared/logger.js';
import { sendAdminAlert } from './alertMailer.js';
import { getErrorMessage, isError } from '../../../../utils/errorUtils.js';
import { RateLimiter } from '../../../../utils/rateLimiter.js';
// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
// Types
export interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  authTimeout?: number;
  keepalive?: {
    interval: number;
    idleInterval: number;
    forceNoop: boolean;
  };
}
export interface EmailAttachment {
  filename: string;
  content: Buffer;
}
export interface EmailMetadata {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  messageId?: string;
  vendor?: string;
}
export interface EmailSearchOptions {
  batchSize?: number;
  markSeen?: boolean;
  maxResults?: number;
  skipRateLimiting?: boolean;
  enableBackpressure?: boolean;
  maxQueueSize?: number;
}
export interface ImapFilter {
  vendor: string;
  fromAddress: string;
  subjectRegex: string;
  daysBack: number;
  filePattern?: string;
  active: boolean;
  lastUsed?: Date;
}
export class ReportNotFoundError extends Error {
  constructor(message = 'No scheduled report emails found') {
    super(message);
    this.name = 'ReportNotFoundError';
  }
}
export class RateLimitExceededError extends Error {
  constructor(message = 'IMAP rate limit exceeded') {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}
export class BackpressureError extends Error {
  constructor(message = 'Email processing queue is full, applying backpressure') {
    super(message);
    this.name = 'BackpressureError';
  }
}
// Circuit breaker for IMAP operations
const imapCircuitBreaker = new CircuitBreaker('imap-report-operations', {
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  inMemory: true,
  onStateChange: (from, to) => {
    logger.info(`IMAP report circuit breaker state changed from ${from} to ${to}`);
    // Send alert when circuit opens
    if (to === 'open') {
      sendAdminAlert(
        'IMAP Circuit Breaker Opened',
        'The IMAP connection circuit breaker has opened due to multiple failures. Email ingestion will be temporarily unavailable.',
        {
          severity: 'error',
          component: 'IMAP Ingestion',
          details: {
            circuitBreaker: 'imap-report-operations',
            previousState: from,
            newState: to,
            resetTimeout: '60 seconds',
          }
        }
      ).catch(err => logger.error('Failed to send circuit breaker alert:', err));
    }
  },
});
// Create rate limiter for IMAP operations
const imapRateLimiter = new RateLimiter('imap-operations', {
  maxRequests: 100, // 100 requests per minute
  windowMs: 60000,  // 1 minute window
  onLimitReached: () => {
    logger.warn('IMAP rate limit reached, throttling requests');
    // Send alert when rate limit is reached
    sendAdminAlert(
      'IMAP Rate Limit Reached',
      'The IMAP rate limiter has been triggered. Requests are being throttled to prevent server overload.',
      {
        severity: 'warning',
        component: 'IMAP Ingestion',
        details: {
          rateLimiter: 'imap-operations',
          maxRequests: 100,
          windowMs: '60 seconds',
        }
      }
    ).catch(err => logger.error('Failed to send rate limit alert:', err));
  }
});
/**
 * Gets the IMAP configuration from environment variables
 */
function getIMAPConfig(): EmailConfig {
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
    keepalive: {
      interval: 5000,      // 5 seconds
      idleInterval: 5000,  // 5 seconds
      forceNoop: true,     // Force NOOP to keep connection alive
    },
  };
}
/**
 * Load all active IMAP filters from the database
 */
export async function loadFilters(): Promise<ImapFilter[]> {
  try {
    const filters = await db
      .select()
      .from(imapFilters)
      .where(eq(imapFilters.active, true));
    logger.info(`Loaded ${filters.length} active IMAP filters`);
    return filters.map(filter => ({
      vendor: filter.vendor,
      fromAddress: filter.fromAddress,
      subjectRegex: filter.subjectRegex,
      daysBack: filter.daysBack,
      filePattern: filter.filePattern || undefined,
      active: filter.active,
      lastUsed: filter.lastUsed || undefined
    }));
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getErrorMessage(error);
    logger.error('Failed to load IMAP filters:', errorMessage);
    return [];
  }
}
/**
 * Get IMAP filter for a vendor from the database
 */
async function getImapFilter(vendor: string): Promise<ImapFilter> {
  try {
    const filters = await db
      .select()
      .from(imapFilters)
      .where(and(
        eq(imapFilters.vendor, vendor),
        eq(imapFilters.active, true)
      ));
    if (filters.length === 0) {
      logger.warn(`No IMAP filter found for vendor: ${vendor}, using defaults`);
      return {
        vendor,
        fromAddress: '',
        subjectRegex: '.*',
        daysBack: 7,
        filePattern: '\\.csv$',
        active: true
      };
    }
    // Update last used timestamp
    await db
      .update(imapFilters)
      .set({
        lastUsed: new Date(),
        updatedAt: new Date()
      })
      .where(eq(imapFilters.id, filters[0].id));
    return {
      vendor: filters[0].vendor,
      fromAddress: filters[0].fromAddress,
      subjectRegex: filters[0].subjectRegex,
      daysBack: filters[0].daysBack,
      filePattern: filters[0].filePattern || undefined,
      active: filters[0].active,
      lastUsed: new Date()
    };
  } catch (error) {
    logger.error(`Failed to get IMAP filter for vendor ${vendor}:`, getErrorMessage(error));
    // Return default filter
    return {
      vendor,
      fromAddress: '',
      subjectRegex: '.*',
      daysBack: 7,
      filePattern: '\\.csv$',
      active: true
    };
  }
}
/**
 * Build IMAP search criteria from filter configuration
 */
function buildSearchCriteria(filter: ImapFilter): any[] {
  const criteria = [];
  // Always include UNSEEN
  criteria.push('UNSEEN');
  // Add FROM if specified
  if (filter.fromAddress) {
    criteria.push(['FROM', filter.fromAddress]);
  }
  // Add SUBJECT if specified (exact match, regex is applied after fetching)
  if (filter.subjectRegex && !filter.subjectRegex.includes('.*')) {
    // If it's a simple string without regex patterns, use it directly
    const simpleSubject = filter.subjectRegex.replace(/[.*+?^${}()|[\]\\]/g, '');
    if (simpleSubject.length > 3) { // Only use if we have a meaningful string
      criteria.push(['SUBJECT', simpleSubject]);
    }
  }
  // Add date range based on daysBack
  if (filter.daysBack > 0) {
    const date = new Date();
    date.setDate(date.getDate() - filter.daysBack);
    criteria.push(['SINCE', date]);
  }
  logger.debug(`Built search criteria for ${filter.vendor}:`, { criteria });
  return criteria;
}
/**
 * Check if an email matches the subject regex pattern
 */
function matchesSubjectRegex(subject: string, regexPattern: string | null): boolean {
  if (!regexPattern) return true;
  try {
    const regex = new RegExp(regexPattern, 'i');
    return regex.test(subject);
  } catch (error) {
    logger.error(`Invalid subject regex pattern: ${regexPattern}`, error);
    return false;
  }
}
/**
 * Check if a filename matches the file pattern
 */
function matchesFilePattern(filename: string, pattern: string | null): boolean {
  if (!pattern) return true;
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(filename);
  } catch (error) {
    logger.error(`Invalid file pattern: ${pattern}`, error);
    return false;
  }
}
/**
 * Archive a failed email for later analysis or retry
 */
export async function archiveFailedEmail(
  vendor: string,
  error: Error,
  emailData: {
    messageId?: string;
    subject?: string;
    from?: string;
    date?: Date;
    rawContent?: string;
  }
): Promise<string> {
  try {
    const result = await db
      .insert(failedEmails)
      .values({
        id: uuidv4(),
        vendor,
        messageId: emailData.messageId || null,
        subject: emailData.subject || null,
        fromAddress: emailData.from || null,
        receivedDate: emailData.date || new Date(),
        errorMessage: getErrorMessage(error),
        errorStack: error instanceof Error ? error.stack : null,
        rawContent: emailData.rawContent || null,
        status: 'failed',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({ id: sql`${failedEmails.id }`});
    const id = result[0]?.id;
    logger.info(`Archived failed email with ID: ${id}`);
    return id;
  } catch (dbError) {
    logger.error('Failed to archive failed email:', getErrorMessage(dbError));
    return '';
  }
}
/**
 * Schedule a failed email for retry
 */
export async function scheduleFailedEmailRetry(id: string, delayMinutes: number = 15): Promise<boolean> {
  try {
    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(nextRetryAt.getMinutes() + delayMinutes);
    await db
      .update(failedEmails)
      .set({
        status: 'retry_scheduled',
        nextRetryAt,
        updatedAt: new Date()
      })
      .where(eq(failedEmails.id, id.toString()));
    logger.info(`Scheduled failed email ${id} for retry at ${nextRetryAt.toISOString()}`);
    return true;
  } catch (error) {
    logger.error(`Failed to schedule retry for email ${id}:`, getErrorMessage(error));
    return false;
  }
}
/**
 * Get failed emails that are due for retry
 */
export async function getFailedEmailsForRetry(limit: number = 10): Promise<any[]> {
  try {
    const now = new Date();
    const emails = await db
      .select()
      .from(failedEmails)
      .where(
        and(
          eq(failedEmails.status, 'retry_scheduled'),
          lte(failedEmails.nextRetryAt, now),
          lte(failedEmails.retryCount, failedEmails.maxRetries)
        )
      )
      .limit(limit);
    return emails;
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getErrorMessage(error);
    logger.error('Failed to get emails for retry:', errorMessage);
    return [];
  }
}
/**
 * Update the health check status for IMAP
 */
async function updateImapHealthCheck(status: 'ok' | 'warning' | 'error', responseTime: number, message: string, details: any = {}) {
  try {
    const now = new Date();
    // Update or insert health check record
    await db
      .insert(healthChecks)
      .values({
        id: 'imap',
        name: 'IMAP Connection',
        status,
        responseTime,
        lastChecked: now,
        message,
        details: JSON.stringify(details),
      })
      .onConflictDoUpdate({
        target: healthChecks.id,
        set: {
          status,
          responseTime,
          lastChecked: now,
          message,
          details: JSON.stringify(details),
          updatedAt: now,
        },
      });
  } catch (error) {
    logger.error('Failed to update IMAP health check:', getErrorMessage(error));
  }
}
/**
 * Perform a health check ping on the IMAP connection
 */
export async function pingImapConnection(): Promise<boolean> {
  const startTime = Date.now();
  let status: 'ok' | 'warning' | 'error' = 'error';
  let message = 'IMAP connection failed';
  let details = {};
  try {
    // Use rate limiter to prevent too many health checks
    return await imapRateLimiter.execute(async () => {
      // Use circuit breaker to protect IMAP operations
      return await imapCircuitBreaker.execute(async () => {
        // Use retry for the connection test
        return await retry(
          async () => {
            const config = getIMAPConfig();
            let connection: imaps.ImapSimple | null = null;
            try {
              // Connect to mailbox
              connection = await imaps.connect({
                imap: config,
              });
              // Open inbox
              await connection.openBox('INBOX');
              // Successfully connected
              const responseTime = Date.now() - startTime;
              status = 'ok';
              message = 'IMAP connection successful';
              details = {
                host: config.host,
                port: config.port,
                user: config.user,
                tls: config.tls,
              };
              // Update health check
              await updateImapHealthCheck(status, responseTime, message, details);
              // Close connection
              await connection.end();
              return true;
            } catch (error) {
              // Use type-safe error handling
              const errorMessage = getErrorMessage(error);
              // Connection failed
              const responseTime = Date.now() - startTime;
              status = 'error';
              message = `IMAP connection failed: ${errorMessage}`;
              details = {
                host: config.host,
                port: config.port,
                user: config.user,
                tls: config.tls,
                error: errorMessage,
              };
              // Update health check
              await updateImapHealthCheck(status, responseTime, message, details);
              // Close connection if it was established
              if (connection) {
                try {
                  await connection.end();
                } catch (closeError) {
                  logger.error('Error closing IMAP connection:', closeError);
                }
              }
              throw error;
            }
          },
          {
            retries: 3,
            minTimeout: 1000,
            factor: 2,
            maxTimeout: 10000, // Cap at 10 seconds for health checks
          }
        );
      });
    }, { wait: true, maxWaitMs: 5000 }); // Wait up to 5 seconds if rate limited
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getErrorMessage(error);
    // Rate limiter, circuit breaker, or retry failed
    const responseTime = Date.now() - startTime;
    status = 'error';
    if (error instanceof RateLimitExceededError) {
      message = 'IMAP health check rate limited';
      details = {
        rateLimiter: 'imap-operations',
        error: errorMessage
      };
    } else {
      message = `IMAP health check failed: ${errorMessage}`;
      details = {
        error: errorMessage,
        circuitBreakerState: imapCircuitBreaker.state,
      };
    }
    // Update health check
    await updateImapHealthCheck(status, responseTime, message, details);
    // Send alert if this is a new failure and not just rate limiting
    if (!(error instanceof RateLimitExceededError)) {
      const lastCheck = await db
        .select()
        .from(healthChecks)
        .where(eq(healthChecks.id, 'imap'.toString()))
        .orderBy(desc(healthChecks.lastChecked))
        .limit(1);
      // Only send alert if status changed from ok to error (not for repeated errors)
      // and not more frequently than every 15 minutes
      const fifteenMinutesAgo = new Date();
      fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
      const shouldSendAlert =
        (lastCheck.length === 0 || lastCheck[0].status !== 'error') ||
        (lastCheck[0].lastChecked < fifteenMinutesAgo);
      if (shouldSendAlert) {
        await sendAdminAlert(
          'IMAP Connection Failed',
          `The system cannot connect to the IMAP server: ${message}`,
          {
            severity: 'error',
            component: 'IMAP Ingestion',
            details,
          }
        );
      }
    }
    return false;
  }
}
/**
 * Fetch emails with attachments from IMAP server
 */
export async function fetchEmailsWithAttachments(
  vendor: string,
  downloadDir: string,
  options: EmailSearchOptions = {}
): Promise<{ filePaths: string[]; emailMetadata: EmailMetadata }[]> {
  const startTime = Date.now();
  // Set default options
  const batchSize = options.batchSize || 20;
  const markSeen = options.markSeen !== false;
  const maxResults = options.maxResults || 100;
  const skipRateLimiting = options.skipRateLimiting || false;
  const enableBackpressure = options.enableBackpressure !== false;
  const maxQueueSize = options.maxQueueSize || 500;
  // Check email queue size if backpressure is enabled
  if (enableBackpressure) {
    try {
      const queueCount = await db
        .select({ count: sql`count(*)` })
        .from(emailQueue)
        .where(eq(emailQueue.status, 'pending'));
      const pendingCount = Number(queueCount[0]?.count || 0);
      if (pendingCount > maxQueueSize) {
        logger.warn(`Email queue has ${pendingCount} pending items, applying backpressure`);
        imapRateLimiter.pause('backpressure');
        throw new BackpressureError(`Email processing queue has ${pendingCount} pending items (max: ${maxQueueSize})`);
      } else if (imapRateLimiter.paused) {
        logger.info('Email queue is below threshold, resuming normal operation');
        imapRateLimiter.resume();
      }
    } catch (error) {
      if (error instanceof BackpressureError) {
        throw error;
      }
      logger.error('Failed to check email queue size:', getErrorMessage(error));
    }
  }
  // Ensure download directory exists
  await mkdir(downloadDir, { recursive: true });
  // Get filter configuration from database
  const filter = await getImapFilter(vendor);
  const searchCriteria = buildSearchCriteria(filter);
  logger.info(`Fetching emails for ${vendor} with criteria:`, { searchCriteria });
  try {
    // Use rate limiter if not skipped
    const executeWithRateLimiter = async <T>(fn: () => Promise<T>): Promise<T> => {
      if (skipRateLimiting) {
        return fn();
      }
      return imapRateLimiter.execute(fn, { wait: true, maxWaitMs: 30000 });
    };
    // Use rate limiter and circuit breaker to protect IMAP operations
    return await executeWithRateLimiter(async () => {
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
              logger.info(`Searching for emails matching criteria:`, { criteria: searchCriteria });
              const results = await connection.search(searchCriteria, {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: false, // Don't mark as seen during search
              });
              logger.info(`Found ${results.length} matching emails for ${vendor}`);
              if (results.length === 0) {
                throw new ReportNotFoundError(`No emails found from ${vendor}`);
              }
              // Process emails in batches
              const processedResults: { filePaths: string[]; emailMetadata: EmailMetadata }[] = [];
              const emailsToProcess = results.slice(0, maxResults);
              const processedMessageIds = new Set<string>(); // For deduplication
              // Process in batches
              for (let i = 0; i < emailsToProcess.length; i += batchSize) {
                const batch = emailsToProcess.slice(i, i + batchSize);
                logger.info(`Processing batch ${i / batchSize + 1} of ${Math.ceil(emailsToProcess.length / batchSize)}`);
                for (const email of batch) {
                  try {
                    const headerPart = email.parts.find(part => part.which === 'HEADER');
                    const bodyPart = email.parts.find(part => part.which === '');
                    if (!headerPart || !bodyPart) {
                      logger.warn('Email missing header or body part, skipping');
                      continue;
                    }
                    const headerInfo = headerPart.body;
                    const subject = headerInfo.subject?.[0] || '';
                    // Check if subject matches regex pattern
                    if (filter.subjectRegex && !matchesSubjectRegex(subject, filter.subjectRegex)) {
                      logger.info(`Skipping email with subject "${subject}" - doesn't match regex pattern`);
                      continue;
                    }
                    // Parse the email
                    const parsed = await simpleParser(bodyPart.body);
                    // Skip if we've already processed this message ID (deduplication)
                    if (parsed.messageId && processedMessageIds.has(parsed.messageId)) {
                      logger.info(`Skipping duplicate email with message ID: ${parsed.messageId}`);
                      continue;
                    }
                    // Extract email metadata
                    const emailMetadata: EmailMetadata = {
                      id: uuidv4(),
                      from: parsed.from?.text || '',
                      to: parsed.to?.text || '',
                      subject: parsed.subject || '',
                      date: parsed.date || new Date(),
                      messageId: parsed.messageId,
                      vendor,
                    };
                    // Check for attachments
                    if (!parsed.attachments || parsed.attachments.length === 0) {
                      logger.info(`Email "${subject}" has no attachments, skipping`);
                      continue;
                    }
                    // Filter attachments by file pattern
                    const validAttachments = parsed.attachments.filter(attachment =>
                      attachment.filename && matchesFilePattern(attachment.filename, filter.filePattern)
                    );
                    if (validAttachments.length === 0) {
                      logger.info(`Email "${subject}" has no matching attachments, skipping`);
                      continue;
                    }
                    // Save each attachment
                    const filePaths: string[] = [];
                    const processedFilenames = new Set<string>(); // For attachment deduplication
                    for (const attachment of validAttachments) {
                      const filename = attachment.filename || `attachment-${Date.now()}.dat`;
                      // Skip duplicate filenames within the same email
                      if (processedFilenames.has(filename)) {
                        logger.info(`Skipping duplicate attachment "${filename}" in email`);
                        continue;
                      }
                      processedFilenames.add(filename);
                      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
                      const filePath = path.join(
                        downloadDir,
                        `${vendor}-${Date.now()}-${sanitizedFilename}`
                      );
                      await writeFile(filePath, attachment.content);
                      logger.info(`Saved attachment "${filename}" to ${filePath}`);
                      filePaths.push(filePath);
                    }
                    // Mark the email as seen if requested
                    if (markSeen) {
                      await retry(async () => connection!.addFlags(email.attributes.uid, 'Seen'), {
                        retries: 2,
                        minTimeout: 1000,
                        factor: 2,
                      });
                      logger.info(`Marked email "${subject}" as seen`);
                    }
                    // Add message ID to processed set for deduplication
                    if (parsed.messageId) {
                      processedMessageIds.add(parsed.messageId);
                    }
                    // Add to results
                    processedResults.push({
                      filePaths,
                      emailMetadata,
                    });
                  } catch (emailError) {
                    // Archive the failed email but continue processing others
                    logger.error(`Error processing email: ${getErrorMessage(emailError)}`);
                    try {
                      // Get the raw content for archiving
                      const bodyPart = email.parts.find(part => part.which === '');
                      const headerPart = email.parts.find(part => part.which === 'HEADER');
                      if (bodyPart && headerPart) {
                        const parsed = await simpleParser(bodyPart.body);
                        const headerInfo = headerPart.body;
                        // Archive the failed email
                        await archiveFailedEmail(
                          vendor,
                          isError(emailError) ? emailError : new Error(String(emailError)),
                          {
                            messageId: parsed.messageId,
                            subject: parsed.subject,
                            from: parsed.from?.text,
                            date: parsed.date,
                            rawContent: bodyPart.body
                          }
                        );
                      }
                    } catch (archiveError) {
                      logger.error('Failed to archive failed email:', getErrorMessage(archiveError));
                    }
                  }
                }
              }
              // Update health check
              await updateImapHealthCheck(
                'ok',
                Date.now() - startTime,
                `Successfully processed ${processedResults.length} emails for ${vendor}`,
                {
                  vendor,
                  emailsFound: results.length,
                  emailsProcessed: processedResults.length,
                  attachmentsSaved: processedResults.reduce((count, result) => count + result.filePaths.length, 0),
                }
              );
              // Close connection
              await connection.end();
              if (processedResults.length === 0) {
                throw new ReportNotFoundError(`No valid attachments found in emails for ${vendor}`);
              }
              return processedResults;
            } catch (error) {
              // Close connection if it was established
              if (connection) {
                try {
                  await connection.end();
                } catch (closeError) {
                  logger.error('Error closing IMAP connection:', getErrorMessage(closeError));
                }
              }
              // Update health check on error
              if (!(error instanceof ReportNotFoundError)) {
                await updateImapHealthCheck(
                  'error',
                  Date.now() - startTime,
                  `IMAP error: ${getErrorMessage(error)}`,
                  {
                    vendor,
                    error: getErrorMessage(error),
                  }
                );
                // Send alert for connection errors
                await sendAdminAlert(
                  'IMAP Ingestion Error',
                  `Error fetching emails for ${vendor}: ${getErrorMessage(error)}`,
                  {
                    severity: 'error',
                    component: 'IMAP Ingestion',
                    details: {
                      vendor,
                      error: getErrorMessage(error),
                      searchCriteria,
                    },
                  }
                );
              }
              throw error;
            }
          },
          {
            retries: 5, // Max 5 retries
            minTimeout: 1000, // Start with 1 second
            maxTimeout: 60000, // Cap at 60 seconds
            factor: 2, // Exponential backoff factor
            onRetry: (error, attempt) => {
              logger.warn(`IMAP retry attempt ${attempt} after error: ${getErrorMessage(error)}`);
            },
          }
        );
      });
    });
  } catch (error) {
    // Handle rate limiter or circuit breaker errors
    if (error instanceof RateLimitExceededError) {
      logger.warn(`IMAP rate limit exceeded for ${vendor}`);
    } else if (error instanceof BackpressureError) {
      logger.warn(`Backpressure applied for ${vendor}: ${getErrorMessage(error)}`);
    } else if (!(error instanceof ReportNotFoundError)) {
      logger.error(`IMAP error for ${vendor}: ${getErrorMessage(error)}`);
    }
    throw error;
  }
}
