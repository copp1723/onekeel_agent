/**
 * CRM Report Email Ingestion
 *
 * This module provides functionality to fetch CRM reports delivered via scheduled email
 * before falling back to Playwright automation. It connects to a mailbox, scans for
 * new messages, downloads attachments, and returns the file path.
 */
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
// Create directories if they don't exist
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
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
 * Gets the IMAP configuration from environment variables
 * @returns IMAP configuration object
 * @throws Error if required environment variables are not set
 */
function getIMAPConfig() {
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
        authTimeout: 10000 // 10 seconds timeout
    };
}
/**
 * Gets search criteria for finding platform-specific emails
 * @param platform CRM platform name (e.g., 'VinSolutions')
 * @returns IMAP search criteria
 */
function getSearchCriteria(platform) {
    // Map of platforms to their email domains or sender addresses
    const platformSenders = {
        'VinSolutions': 'no-reply@vinsolutions.com',
        'VAUTO': 'noreply@vauto.com',
        // Add more platforms as needed
    };
    const sender = platformSenders[platform] || '';
    return [
        'UNSEEN', // Only get unread messages
        ['FROM', sender]
    ];
}
/**
 * Fetches CRM reports from scheduled emails
 * @param platform The CRM platform (e.g., 'VinSolutions')
 * @param downloadDir Directory to save attachments to
 * @returns Path to the downloaded file, or null if none found
 * @throws ReportNotFoundError if no matching emails are found
 */
export async function ingestScheduledReport(platform, downloadDir) {
    console.log(`📬 Checking emails for ${platform} reports...`);
    // Ensure download directory exists
    await mkdir(downloadDir, { recursive: true });
    const config = getIMAPConfig();
    let connection = null;
    try {
        // Connect to mailbox
        console.log(`Connecting to ${config.host}:${config.port} as ${config.user}...`);
        connection = await imaps.connect({
            imap: config
        });
        // Open inbox
        await connection.openBox('INBOX');
        // Search for relevant emails
        const searchCriteria = getSearchCriteria(platform);
        console.log(`Searching for emails matching criteria:`, searchCriteria);
        const results = await connection.search(searchCriteria, {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: false
        });
        console.log(`Found ${results.length} matching emails`);
        if (results.length === 0) {
            throw new ReportNotFoundError(`No emails found from ${platform} platform`);
        }
        // Process each email
        for (const email of results) {
            // Get email message
            const all = email.parts.find(part => part.which === '');
            if (!all)
                continue;
            // Parse email
            const parsed = await simpleParser(all.body);
            console.log(`Processing email: ${parsed.subject}`);
            // Check for attachments
            if (!parsed.attachments || parsed.attachments.length === 0) {
                console.log('No attachments found in this email');
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
                // Save attachment
                console.log(`Saving attachment to ${filePath}`);
                await writeFile(filePath, attachment.content);
                // Mark the email as seen
                await connection.addFlags(email.attributes.uid, 'Seen');
                // Return the first saved file path
                return filePath;
            }
        }
        // If we got here, none of the emails had valid attachments
        throw new ReportNotFoundError('No valid attachments found in emails');
    }
    catch (error) {
        if (error instanceof ReportNotFoundError) {
            throw error;
        }
        console.error('Error processing emails:', error);
        throw new Error(`Failed to process emails: ${error instanceof Error ? error.message : String(error)}`);
    }
    finally {
        // Close the connection in the finally block to ensure it happens
        if (connection) {
            try {
                await connection.end();
                console.log('IMAP connection closed');
            }
            catch (error) {
                console.error('Error closing IMAP connection:', error);
            }
        }
    }
}
/**
 * Attempts to fetch a CRM report for the specified platform from emails
 * Falls back to null if the environment isn't configured for email access
 *
 * @param platform CRM platform identifier
 * @returns Path to the report file or null if not found
 */
export async function tryFetchReportFromEmail(platform) {
    const isEmailConfigured = !!(process.env.EMAIL_USER &&
        process.env.EMAIL_PASS &&
        process.env.EMAIL_HOST);
    if (!isEmailConfigured) {
        console.log('Email credentials not configured, skipping email ingestion');
        return null;
    }
    try {
        // Default download directory
        const downloadDir = process.env.DOWNLOAD_DIR || './downloads';
        // Attempt to fetch report from email
        const filePath = await ingestScheduledReport(platform, downloadDir);
        return filePath;
    }
    catch (error) {
        if (error instanceof ReportNotFoundError) {
            console.log('No reports found in email:', error.message);
            return null;
        }
        console.error('Error fetching report from email:', error);
        return null;
    }
}
//# sourceMappingURL=ingestScheduledReport.js.map