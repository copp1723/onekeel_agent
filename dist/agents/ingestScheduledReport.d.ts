/**
 * CRM Report Email Ingestion
 *
 * This module provides functionality to fetch CRM reports delivered via scheduled email
 * before falling back to Playwright automation. It connects to a mailbox, scans for
 * new messages, downloads attachments, and returns the file path.
 */
import { CRMPlatform } from '../types.js';
/**
 * Custom error for when no report is found in the email
 */
export declare class ReportNotFoundError extends Error {
    constructor(message?: string);
}
/**
 * Fetches CRM reports from scheduled emails
 * @param platform The CRM platform (e.g., 'VinSolutions')
 * @param downloadDir Directory to save attachments to
 * @returns Path to the downloaded file, or null if none found
 * @throws ReportNotFoundError if no matching emails are found
 */
export declare function ingestScheduledReport(platform: string, downloadDir: string): Promise<string>;
/**
 * Attempts to fetch a CRM report for the specified platform from emails
 * Falls back to null if the environment isn't configured for email access
 *
 * @param platform CRM platform identifier
 * @returns Path to the report file or null if not found
 */
export declare function tryFetchReportFromEmail(platform: CRMPlatform): Promise<string | null>;
