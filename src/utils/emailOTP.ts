/**
 * Email OTP Retrieval
 * 
 * This module handles retrieving One-Time Passwords (OTPs) from email accounts.
 * It connects to the specified email account, searches for OTP messages,
 * and extracts the codes using regular expressions.
 */

import * as ImapLib from 'imap-simple';
import { simpleParser } from 'mailparser';
import type { Message, ImapSimple } from 'imap-simple';

/**
 * Configuration interface for email connection
 */
interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port?: number;
  tls?: boolean;
  tlsOptions?: { rejectUnauthorized: boolean };
}

// Define search criteria types
type SearchCriteria = Array<string | string[] | [string, string] | [string, string[]]>;

/**
 * Retrieve an OTP code from an email account
 * This function connects to an email account, searches for recent emails
 * containing OTP codes, and extracts the first code it finds.
 * 
 * @param emailUser - Email username
 * @param emailPass - Email password
 * @param emailHost - IMAP server hostname
 * @param options - Additional options like port, timeouts, etc.
 * @returns The OTP code as a string, or null if none found
 */
export async function getEmailOTP(
  emailUser: string,
  emailPass: string,
  emailHost: string,
  options: {
    port?: number;
    tls?: boolean;
    searchCriteria?: any;
    minutesAgo?: number;
    regexPattern?: RegExp;
  } = {}
): Promise<string | null> {
  if (!emailUser || !emailPass || !emailHost) {
    console.warn('Missing required email credentials for OTP retrieval');
    return null;
  }

  const port = options.port || 993;
  const tls = options.tls !== false;
  const minutesAgo = options.minutesAgo || 5;
  const regexPattern = options.regexPattern || /\b(\d{6})\b/;

  // Calculate search time window
  const searchSince = new Date();
  searchSince.setMinutes(searchSince.getMinutes() - minutesAgo);
  const sinceDate = searchSince.toISOString();

  // Default search criteria for OTP emails
  const searchCriteria: SearchCriteria = options.searchCriteria || [
    'UNSEEN',
    ['SINCE', sinceDate],
    ['SUBJECT', 'verification'],
    ['OR', ['SUBJECT', 'code'], ['SUBJECT', 'OTP'], ['SUBJECT', 'verification']]
  ];

  // Configure connection
  const config: EmailConfig = {
    user: emailUser,
    password: emailPass,
    host: emailHost,
    port,
    tls,
    tlsOptions: {
      rejectUnauthorized: false
    }
  };

  try {
    console.log(`Connecting to ${emailHost} to retrieve OTP...`);
    const connection: ImapSimple = await ImapLib.connect({ imap: config });
    
    // Open inbox
    await connection.openBox('INBOX');
    
    // Search for emails matching criteria
    const searchResults: number[] = await connection.search(searchCriteria, {}) as unknown as number[];
    console.log(`Found ${searchResults.length} emails matching criteria`);
    
    if (searchResults.length === 0) {
      await connection.end();
      return null;
    }
    
    // Fetch most recent email content
    const messages = await connection.fetch(searchResults, {
      bodies: ['TEXT', 'HEADER'],
      markSeen: true
    }) as unknown as Message[];
    
    // Process emails in reverse order (newest first)
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const textPart = message.parts.find((part: any) => part.which === 'TEXT');
      
      if (textPart) {
        const parsed = await simpleParser(textPart.body);
        const text = parsed.text || '';
        
        // Use regex to find OTP code
        const match = text.match(regexPattern);
        if (match && match[1]) {
          const otp = match[1];
          console.log(`OTP code found: ${otp.slice(0, 2)}****`);
          
          await connection.end();
          return otp;
        }
      }
    }
    
    await connection.end();
    console.log('No OTP found in emails');
    return null;
    
  } catch (error) {
    console.error('Error retrieving OTP from email:', error);
    return null;
  }
}

/**
 * Get OTP from email using environment variables
 * This is a convenience wrapper that uses environment variables
 * for email credentials.
 * 
 * @param customAddress - Optional custom email address to use instead of EMAIL_USER
 * @returns The OTP code or null if not found
 */
export async function getOTPFromEmail(customAddress?: string): Promise<string | null> {
  const emailUser = customAddress || process.env.OTP_EMAIL_USER || process.env.EMAIL_USER || '';
  const emailPass = process.env.OTP_EMAIL_PASS || process.env.EMAIL_PASS || '';
  const emailHost = process.env.EMAIL_HOST || '';
  const emailPort = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 993;
  const emailTLS = process.env.EMAIL_TLS !== 'false';
  
  if (!emailUser || !emailPass || !emailHost) {
    console.warn('Missing required email configuration for OTP retrieval');
    return null;
  }
  
  return getEmailOTP(emailUser, emailPass, emailHost, {
    port: emailPort,
    tls: emailTLS
  });
}

// For testing and demonstration purposes
if (require.main === module) {
  (async () => {
    const emailUser = process.env.EMAIL_USER || '';
    const emailPass = process.env.EMAIL_PASS || '';
    const emailHost = process.env.EMAIL_HOST || '';
    
    if (!emailUser || !emailPass || !emailHost) {
      console.error('Missing required email configuration');
      process.exit(1);
    }
    
    const otp = await getEmailOTP(emailUser, emailPass, emailHost);
    
    if (otp) {
      console.log(`✅ OTP retrieved: ${otp}`);
    } else {
      console.log('❌ No OTP found');
    }
  })();
}