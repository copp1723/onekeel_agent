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
 *
 * Enhanced with retry and circuit breaker patterns for improved reliability.
 */
import {
  ingestScheduledReport,
  ReportNotFoundError,
  tryFetchReportFromEmail,
} from './ingestScheduledReport.js';
import { isError } from '../../../../utils/errorUtils.js';
import { CRMPlatform, EnvVars } from '../../../../types.js';
import * as path from 'path';
import * as fs from 'fs';
import { retry } from '../../../../utils/retry.js';
import { CircuitBreaker } from '../../../../utils/circuitBreaker.js';
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
  error: (message: string, ...meta: any[]) => console.error(`[ERROR] ${message}`, ...meta),
};
/**
 * Circuit breaker for the email ingestion flow
 */
const emailIngestionCircuitBreaker = new CircuitBreaker('email-ingestion-flow', {
  failureThreshold: 3,
  resetTimeout: 5 * 60 * 1000, // 5 minutes
  successThreshold: 2,
  inMemory: true,
  onStateChange: (from, to) => {
    console.log(`Email ingestion circuit breaker state changed from ${from} to ${to}`);
  },
});
/**
 * Orchestrates the email-only ingestion process with retry and circuit breaker
 * Attempts email-based ingestion with enhanced error handling and reliability
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
      vinsolutions: 'VinSolutions',
      vauto: 'VAUTO',
    };
    const normalizedPlatform = platformMap[platform.toLowerCase()] || platform;
    // Use circuit breaker to protect the email ingestion flow
    return await emailIngestionCircuitBreaker.execute(async () => {
      // Attempt email-based ingestion with retry
      logger.info(`Attempting email ingestion for ${normalizedPlatform}...`);
      return await retry(
        async () => {
          try {
            // Check if email configuration is available
            const isEmailConfigured = !!(
              process.env.EMAIL_USER &&
              process.env.EMAIL_PASS &&
              process.env.EMAIL_HOST
            );
            if (!isEmailConfigured) {
              throw new Error(
                'Email configuration is missing. Please set EMAIL_USER, EMAIL_PASS, and EMAIL_HOST environment variables.'
              );
            }
            // tryFetchReportFromEmail already has internal retry and circuit breaker
            const filePath = await tryFetchReportFromEmail(normalizedPlatform as CRMPlatform);
            if (filePath) {
              const duration = ((Date.now() - startTime) / 1000).toFixed(2);
              logger.info(`✅ Successfully fetched report via EMAIL in ${duration}s`, {
                path: filePath,
                platform: normalizedPlatform,
                ingestionPath,
              });
              return filePath;
            } else {
              // If tryFetchReportFromEmail returns null but doesn't throw, we still need to throw an error
              throw new ReportNotFoundError(`No report found in email for ${normalizedPlatform}`);
            }
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
              logger.error(
                `No report found in email: ${isError(error) ? (error instanceof Error ? (isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error) : String(error)) : String(error)) : String(error)) : String(error)}`
              );
              throw new Error(
                `Email ingestion failed: No report found for ${normalizedPlatform}. Please check that scheduled reports are being sent to the configured email account.`
              );
            } else if (
              error instanceof Error &&
              (error instanceof Error
                ? error instanceof Error
                  ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                  : String(error)
                : String(error)
              ).includes('Missing required email configuration')
            ) {
              logger.error(
                `Email configuration error: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)}`
              );
              throw new Error(
                `Email ingestion failed: Missing required email configuration. Please set EMAIL_USER, EMAIL_PASS, and EMAIL_HOST environment variables.`
              );
            } else if (
              error instanceof Error &&
              (error instanceof Error
                ? error instanceof Error
                  ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                  : String(error)
                : String(error)
              ).includes('Authentication failed')
            ) {
              logger.error(
                `Email authentication error: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)}`
              );
              throw new Error(
                `Email ingestion failed: Authentication failed. Please check your email credentials.`
              );
            } else if (
              error instanceof Error &&
              (error instanceof Error
                ? error instanceof Error
                  ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                  : String(error)
                : String(error)
              ).includes('connect')
            ) {
              logger.error(
                `Email connection error: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)}`
              );
              throw new Error(
                `Email ingestion failed: Could not connect to email server. Please check your network connection and email server settings.`
              );
            } else if (
              error instanceof Error &&
              (error instanceof Error
                ? error instanceof Error
                  ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                  : String(error)
                : String(error)
              ).includes('circuit is open')
            ) {
              logger.warn(
                `Email service circuit is open: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)}`
              );
              throw new Error(`Email service is currently unavailable. Please try again later.`);
            } else {
              logger.error(`Unexpected error during email ingestion:`, error);
              throw new Error(
                `Email ingestion failed: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
              );
            }
          }
        },
        {
          retries: 2,
          minTimeout: 3000,
          factor: 2,
          jitter: true,
          retryIf: (error) => {
            // Only retry on network errors or connection issues
            // Don't retry on configuration errors, authentication failures, or report not found
            const errorMsg = error?.message?.toLowerCase() || '';
            return (
              errorMsg.includes('network') ||
              errorMsg.includes('connection') ||
              errorMsg.includes('timeout') ||
              errorMsg.includes('econnrefused') ||
              errorMsg.includes('enotfound')
            );
          },
          onRetry: (error, attempt) => {
            logger.warn(`Email ingestion retry attempt ${attempt}:`, {
              error: error?.message || String(error),
              platform: normalizedPlatform,
            });
          },
        }
      );
    });
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`❌ Failed to fetch report after ${duration}s (path: ${ingestionPath})`, error);
    // Handle circuit breaker errors
    if (error.name === 'CircuitOpenError') {
      throw new Error(
        `Email ingestion service is currently unavailable. The circuit is open due to multiple failures.`
      );
    }
    // Propagate the error with additional context
    if (error instanceof Error) {
      throw new Error(
        `Email ingestion failed: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)}`
      );
    } else {
      throw new Error(`Email ingestion failed: ${String(error)}`);
    }
  }
}
