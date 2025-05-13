import * as imap from 'imap-simple';
import { ParsedMail, simpleParser } from 'mailparser';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}

interface OTPEmail {
  to: string;
  subject: string;
  otp: string;
  expiresIn: number; // milliseconds
}

export async function sendOTP(email: string, config: EmailConfig): Promise<string> {
  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Create a test account if real credentials not provided
  let transporter;
  if (!config.user || !config.password) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.tls,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  // Send email with the OTP
  const info = await transporter.sendMail({
    from: '"Security Service" <security@example.com>',
    to: email,
    subject: 'Your One-Time Password',
    text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
    html: `<b>Your OTP is: ${otp}</b><p>It will expire in 10 minutes.</p>`,
  });

  console.log('OTP email sent:', info.messageId);
  if (info.testAccount) {
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  // Hash the OTP before storing it
  const hashedOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Store the OTP with expiration time (10 minutes)
  const expiresAt = Date.now() + 10 * 60 * 1000;

  // In a real application, you would store this in a database
  // For this example, we'll return it for verification
  return `${hashedOTP}:${expiresAt}`;
}

export function verifyOTP(
  inputOTP: string,
  hashedOTPWithExpiry: string
): boolean {
  const [hashedOTP, expiryTimeStr] = hashedOTPWithExpiry.split(':');
  const expiryTime = parseInt(expiryTimeStr);

  // Check if OTP has expired
  if (Date.now() > expiryTime) {
    return false;
  }

  // Hash the input OTP and compare
  const hashedInput = crypto
    .createHash('sha256')
    .update(inputOTP)
    .digest('hex');

  return hashedInput === hashedOTP;
}

// For checking emails for incoming OTP (useful for automation)
/**
 * Configuration for email OTP retrieval with timeout
 */
export interface EmailOTPConfig extends EmailConfig {
  /** Timeout in milliseconds for the entire operation (default: 30000) */
  timeoutMs?: number;
  /** OTP pattern to match in email text (default: /OTP is: (\d{6})/) */
  otpPattern?: RegExp;
  /** Whether to mark emails as seen after reading (default: true) */
  markSeen?: boolean;
  /** Search criteria for finding OTP emails */
  searchCriteria?: any;
}

/**
 * Checks emails for an OTP and returns it
 * @param config - Email configuration with optional timeout and pattern settings
 * @returns The OTP if found, null otherwise
 */
export async function checkEmailForOTP(config: EmailOTPConfig): Promise<string | null> {
  // Set defaults for optional parameters
  const timeoutMs = config.timeoutMs || 30000;
  const otpPattern = config.otpPattern || /OTP is: (\d{6})/;
  const markSeen = config.markSeen !== false; // Default to true

  // Create a promise that will reject after the timeout
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error(`OTP email check timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  // Create the actual email checking promise
  const checkPromise = new Promise<string | null>(async (resolve) => {
    let connection: any = null;

    try {
      connection = await imap.connect({
        imap: {
          user: config.user,
          password: config.password,
          host: config.host,
          port: config.port,
          tls: config.tls,
          authTimeout: 3000
        }
      });

      await connection.openBox('INBOX');

      // Default search for recent OTP emails
      const defaultCriteria = [
        'UNSEEN',
        ['SUBJECT', 'OTP'],
        ['SINCE', new Date(Date.now() - 24 * 60 * 60 * 1000)]
      ];

      // Use the criteria from searchCriteria if provided, otherwise use default
      const criteria = config.searchCriteria?.criteria || defaultCriteria;

      // Search for messages matching criteria with fetch options
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: markSeen
      };

      // Search and fetch in one step
      const messages = await connection.search(criteria, fetchOptions);

      if (!messages || messages.length === 0) {
        resolve(null);
        return;
      }

      // Process fetched messages
      for (const message of messages) {
        const all = message.parts.find((part: any) => part.which === 'TEXT');
        const parsed: ParsedMail = await simpleParser(all?.body || '');

        // Extract OTP using the provided regex pattern
        const otpMatch = parsed.text?.match(otpPattern);
        if (otpMatch && otpMatch[1]) {
          resolve(otpMatch[1]);
          return;
        }
      }

      resolve(null);
    } catch (error) {
      console.error('Error checking email for OTP:', error);
      resolve(null);
    } finally {
      // Always close the connection if it was opened
      if (connection) {
        try {
          await connection.end();
        } catch (err) {
          console.error('Error closing IMAP connection:', err);
        }
      }
    }
  });

  // Race the timeout against the actual operation
  try {
    return await Promise.race([checkPromise, timeoutPromise]);
  } catch (error) {
    console.error('OTP retrieval failed:', error);
    return null;
  }
}