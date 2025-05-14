/**
 * Email-based report ingestion service
 * Handles fetching CRM reports from scheduled emails
 */

import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import {
  EmailConfig,
  EmailSearchCriteria,
} from '../types/email.js';

// Convert fs.mkdir to promise-based
const mkdir = promisify(fs.mkdir);

// Removed unused Attachment interface

export class ReportNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportNotFoundError';
  }
}

/**
 * Gets the IMAP configuration from environment variables
 */
export function getEmailConfig(): EmailConfig {
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '993', 10);
  const tls = process.env.EMAIL_TLS !== 'false';

  if (!user || !password || !host) {
    throw new Error('Missing required email configuration: EMAIL_USER, EMAIL_PASS, EMAIL_HOST');
  }

  return {
    user,
    password,
    host,
    port,
    tls,
    authTimeout: 3000,
    keepalive: {
      interval: 5000,
      idleInterval: 5000,
      forceNoop: true
    }
  };
}

/**
 * Gets search criteria for the specified platform
 */
export function getSearchCriteria(platform: string): EmailSearchCriteria {
  // Default search criteria - last 7 days
  const defaultCriteria = [
    ['UNSEEN'],
    ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]
  ];

  // Platform-specific search criteria
  const platformCriteria: Record<string, EmailSearchCriteria> = {
    'VinSolutions': {
      criteria: [
        ['UNSEEN'],
        ['FROM', 'reports@vinsolutions.com'],
        ['SUBJECT', 'Report Export']
      ],
      filePattern: /\.csv$/i
    },
    'VAUTO': {
      criteria: [
        ['UNSEEN'],
        ['FROM', 'noreply@vauto.com'],
        ['SUBJECT', 'Your vAuto Report']
      ],
      filePattern: /\.csv$/i
    }
  };

  return platformCriteria[platform] || { criteria: defaultCriteria, filePattern: /\.csv$/i };
}

/**
 * Attempts to fetch CRM reports from scheduled emails
 */
export async function ingestScheduledReport(
  platform: string,
  downloadDir: string
): Promise<string> {
  console.log(`📬 Checking emails for ${platform} reports...`);

  // Ensure download directory exists
  await mkdir(downloadDir, { recursive: true });

  const config = getEmailConfig();
  let connection: imaps.ImapSimple | null = null;

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
    console.log('Searching for emails matching criteria:', searchCriteria);

    const results = await connection.search(searchCriteria.criteria, {
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
      if (!all) continue;

      const id = email.attributes.uid;

      // Parse email
      const parsed = await simpleParser(all.body);

      // Check if email has attachments
      if (!parsed.attachments || parsed.attachments.length === 0) {
        console.log(`Email ${id} has no attachments, skipping`);
        continue;
      }

      // Find matching attachment
      const attachment = parsed.attachments.find(att =>
        att.filename && searchCriteria.filePattern.test(att.filename)
      );

      if (!attachment || !attachment.filename) {
        console.log(`Email ${id} has no matching attachments, skipping`);
        continue;
      }

      // Save attachment
      const timestamp = Date.now();
      const filename = `${platform}-report-${timestamp}${path.extname(attachment.filename)}`;
      const filePath = path.join(downloadDir, filename);

      fs.writeFileSync(filePath, attachment.content);
      console.log(`Saved attachment from email ${id} to ${filePath}`);

      // Mark email as seen using the numeric UID
      await connection.addFlags(id, '\\Seen');

      // Return the file path
      await connection.end();
      return filePath;
    }

    // If we get here, no matching attachments were found
    throw new ReportNotFoundError(`No attachments found matching pattern for ${platform}`);

  } catch (error) {
    // Ensure connection is closed on error
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing IMAP connection:', closeError);
      }
    }

    // Rethrow the original error
    throw error;
  }
}