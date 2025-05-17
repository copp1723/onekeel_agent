/**
 * Email-based report ingestion module
 * Handles fetching CRM reports from scheduled emails
 */
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Convert fs.mkdir to promise-based
const mkdir = promisify(fs.mkdir);

/**
 * Custom error for when no reports are found
 */
export class ReportNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReportNotFoundError';
  }
}

/**
 * Gets the IMAP configuration from environment variables
 * @returns {Object} IMAP configuration object
 */
function getIMAPConfig() {
  // Get configuration from environment variables
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
 * @param {string} platform - CRM platform name
 * @returns {Object} Search criteria
 */
function getSearchCriteria(platform) {
  // Default search criteria
  const defaultCriteria = [['UNSEEN'], ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]];
  
  // Platform-specific search criteria
  const platformCriteria = {
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
 * Fetches CRM reports from scheduled emails
 * @param {string} platform The CRM platform (e.g., 'VinSolutions')
 * @param {string} downloadDir Directory to save attachments to
 * @returns {Promise<string>} Path to the downloaded file, or null if none found
 * @throws {ReportNotFoundError} if no matching emails are found
 */
export async function ingestScheduledReport(
  platform,
  downloadDir
) {
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
      const id = email.attributes.uid;
      const idHeader = email.attributes.uid + ':*';
      
      // Parse email
      const parsed = await simpleParser(all.body);
      
      // Check if email has attachments
      if (!parsed.attachments || parsed.attachments.length === 0) {
        console.log(`Email ${id} has no attachments, skipping`);
        continue;
      }
      
      // Find matching attachment
      const attachment = parsed.attachments.find(att => 
        searchCriteria.filePattern.test(att.filename)
      );
      
      if (!attachment) {
        console.log(`Email ${id} has no matching attachments, skipping`);
        continue;
      }
      
      // Save attachment
      const timestamp = Date.now();
      const filename = `${platform}-report-${timestamp}${path.extname(attachment.filename)}`;
      const filePath = path.join(downloadDir, filename);
      
      fs.writeFileSync(filePath, attachment.content);
      console.log(`Saved attachment from email ${id} to ${filePath}`);
      
      // Mark email as seen
      await connection.addFlags(idHeader, '\\Seen');
      
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

/**
 * Attempts to fetch a CRM report for the specified platform from emails
 * Falls back to null if the environment isn't configured for email access
 * 
 * @param {string} platform CRM platform identifier
 * @returns {Promise<string|null>} Path to the report file or null if not found
 */
export async function tryFetchReportFromEmail(platform) {
  const isEmailConfigured = !!(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_HOST
  );
  
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
    
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      console.log('No reports found in email:', error.message);
      return null;
    }
    
    console.error('Error fetching report from email:', error);
    return null;
  }
}