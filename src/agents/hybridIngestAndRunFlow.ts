/**
 * Email-Only Ingestion and Flow Execution
 *
 * This module provides a unified entrypoint for CRM report ingestion via email:
 * - Attempts to fetch reports from scheduled emails
 * - Provides detailed error handling and diagnostics
 * - No browser automation fallback
 *
 * This orchestrator logs diagnostic information and provides a clean interface
 * for the rest of the application.
 */
import { ingestScheduledReport, ReportNotFoundError, tryFetchReportFromEmail } from './ingestScheduledReport.js';
import { CRMPlatform, EnvVars } from '../types.js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Logger interface for dependency injection and testing
 */
export interface Logger {
  info(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  error(message: string, ...meta: any[]): void;
}

/**
 * Default console-based logger implementation
 */
export const consoleLogger: Logger = {
  info: (message: string, ...meta: any[]) => console.log(`[INFO] ${message}`, ...meta),
  warn: (message: string, ...meta: any[]) => console.warn(`[WARN] ${message}`, ...meta),
  error: (message: string, ...meta: any[]) => console.error(`[ERROR] ${message}`, ...meta)
};

/**
 * Orchestrates the email-only ingestion process
 * Attempts email-based ingestion with enhanced error handling
 *
 * @param platform - The CRM platform (e.g., 'VinSolutions', 'VAUTO')
 * @param envVars - Environment variables needed for configuration
 * @param logger - Optional logger for diagnostic information
 * @returns Path to the downloaded file
 * @throws Error with detailed message when email ingestion fails
 */
export async function emailIngestAndRunFlow(
  platform: string,
  envVars: EnvVars,
  logger: Logger = consoleLogger
): Promise<string> {
  const startTime = Date.now();
  const ingestionPath = 'email';

  logger.info(`Starting email-only ingestion for ${platform}`);

  // Create downloads directory if it doesn't exist
  const downloadDir = envVars.DOWNLOAD_DIR || './downloads';
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  try {
    // Normalize platform name for consistency
    const platformMap: Record<string, CRMPlatform> = {
      'vinsolutions': 'VinSolutions',
      'vauto': 'VAUTO'
    };
    const normalizedPlatform = platformMap[platform.toLowerCase()] || platform;

    // Attempt email-based ingestion
    logger.info(`Attempting email ingestion for ${normalizedPlatform}...`);
    let filePath: string | null = null;

    try {
      // Check if email configuration is available
      const isEmailConfigured = !!(
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASS &&
        process.env.EMAIL_HOST
      );

      if (!isEmailConfigured) {
        throw new Error('Email configuration is missing. Please set EMAIL_USER, EMAIL_PASS, and EMAIL_HOST environment variables.');
      }

      filePath = await tryFetchReportFromEmail(normalizedPlatform as CRMPlatform);

      if (filePath) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`✅ Successfully fetched report via EMAIL in ${duration}s`, {
          path: filePath,
          platform: normalizedPlatform,
          ingestionPath
        });
        return filePath;
      } else {
        // If tryFetchReportFromEmail returns null but doesn't throw, we still need to throw an error
        throw new ReportNotFoundError(`No report found in email for ${normalizedPlatform}`);
      }
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        logger.error(`No report found in email: ${error.message}`);
        throw new Error(`Email ingestion failed: No report found for ${normalizedPlatform}. Please check that scheduled reports are being sent to the configured email account.`);
      } else if (error instanceof Error && error.message.includes('Missing required email configuration')) {
        logger.error(`Email configuration error: ${error.message}`);
        throw new Error(`Email ingestion failed: Missing required email configuration. Please set EMAIL_USER, EMAIL_PASS, and EMAIL_HOST environment variables.`);
      } else if (error instanceof Error && error.message.includes('Authentication failed')) {
        logger.error(`Email authentication error: ${error.message}`);
        throw new Error(`Email ingestion failed: Authentication failed. Please check your email credentials.`);
      } else if (error instanceof Error && error.message.includes('connect')) {
        logger.error(`Email connection error: ${error.message}`);
        throw new Error(`Email ingestion failed: Could not connect to email server. Please check your network connection and email server settings.`);
      } else {
        logger.error(`Unexpected error during email ingestion:`, error);
        throw new Error(`Email ingestion failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`❌ Failed to fetch report after ${duration}s (path: ${ingestionPath})`, error);

    // Propagate the error with additional context
    if (error instanceof Error) {
      throw new Error(`Email ingestion failed: ${error.message}`);
    } else {
      throw new Error(`Email ingestion failed: ${String(error)}`);
    }
  }
}