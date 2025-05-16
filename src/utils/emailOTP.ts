import * as imap from 'imap-simple';
import { isError } from '../utils/errorUtils.js';
import { ParsedMail, simpleParser } from 'mailparser';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { retry } from '../utils/retry.js';
import { CircuitBreaker } from '../utils/circuitBreaker.js';
import logger from '../shared/logger.js';

interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}

/**
 * Circuit breaker for SMTP operations
 */
const smtpCircuitBreaker = new CircuitBreaker('smtp-operations', {
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  inMemory: true,
});

export async function sendOTP(email: string, config: EmailConfig): Promise<string> {
  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Use circuit breaker to protect SMTP operations
  return await smtpCircuitBreaker.execute(async () => {
    // Use retry for SMTP operations
    return await retry(
      async () => {
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
        logger.info('OTP email sent:', { messageId: info.messageId });
        if (info.testAccount) {
          logger.info('Preview URL:', { url: nodemailer.getTestMessageUrl(info) });
        }
        // Hash the OTP before storing it
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
        // Store the OTP with expiration time (10 minutes)
        const expiresAt = Date.now() + 10 * 60 * 1000;
        // In a real application, you would store this in a database
        // For this example, we'll return it for verification
        return `${hashedOTP}:${expiresAt}`;
      },
      {
        retries: 3,
        minTimeout: 1000,
        factor: 2,
        retryIf: (error) => {
          // Only retry on network errors or authentication issues
          const errorMsg = error?.message?.toLowerCase() || '';
          return (
            errorMsg.includes('network') ||
            errorMsg.includes('connection') ||
            errorMsg.includes('timeout') ||
            errorMsg.includes('authentication')
          );
        },
        onRetry: (error, attempt) => {
          logger.warn(`SMTP retry attempt ${attempt} after error:`, {
            error: error?.message || String(error),
          });
        },
      }
    );
  });
}

export function verifyOTP(inputOTP: string, hashedOTPWithExpiry: string): boolean {
  const [hashedOTP, expiryTimeStr] = hashedOTPWithExpiry.split(':');
  const expiryTime = parseInt(expiryTimeStr);
  // Check if OTP has expired
  if (Date.now() > expiryTime) {
    return false;
  }
  // Hash the input OTP and compare
  const hashedInput = crypto.createHash('sha256').update(inputOTP).digest('hex');
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
 * Circuit breaker for IMAP operations
 */
const imapCircuitBreaker = new CircuitBreaker('imap-operations', {
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  inMemory: true,
  onStateChange: (from, to) => {
    logger.info(`IMAP circuit breaker state changed from ${from} to ${to}`);
  },
});

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
  try {
    // Use circuit breaker to protect IMAP operations
    return await imapCircuitBreaker.execute(async () => {
      // Use retry for IMAP operations
      return await retry(
        async () => {
          let connection: any = null;
          try {
            // Create a promise that will reject after the timeout
            const timeoutPromise = new Promise<null>((_, reject) => {
              setTimeout(
                () => reject(new Error(`OTP email check timed out after ${timeoutMs}ms`)),
                timeoutMs
              );
            });
            // Create the actual email checking promise
            const checkPromise = new Promise<string | null>(async (resolve) => {
              try {
                logger.info('Connecting to IMAP server', {
                  host: config.host,
                  port: config.port,
                });
                connection = await imap.connect({
                  imap: {
                    user: config.user,
                    password: config.password,
                    host: config.host,
                    port: config.port,
                    tls: config.tls,
                    authTimeout: 3000,
                  },
                });
                await connection.openBox('INBOX');
                logger.info('Successfully opened INBOX');
                // Default search for recent OTP emails
                const defaultCriteria = [
                  'UNSEEN',
                  ['SUBJECT', 'OTP'],
                  ['SINCE', new Date(Date.now() - 24 * 60 * 60 * 1000)],
                ];
                // Use the criteria from searchCriteria if provided, otherwise use default
                const criteria = config.searchCriteria?.criteria || defaultCriteria;
                // Search for messages matching criteria with fetch options
                const fetchOptions = {
                  bodies: ['HEADER', 'TEXT'],
                  markSeen: markSeen,
                };
                // Search and fetch in one step
                logger.info('Searching for emails with criteria', { criteria });
                const messages = await connection.search(criteria, fetchOptions);
                if (!messages || messages.length === 0) {
                  logger.info('No matching emails found');
                  resolve(null);
                  return;
                }
                logger.info(`Found ${messages.length} matching emails`);
                // Process fetched messages
                for (const message of messages) {
                  const all = message.parts.find((part: any) => part.which === 'TEXT');
                  const parsed: ParsedMail = await simpleParser(all?.body || '');
                  // Extract OTP using the provided regex pattern
                  const otpMatch = parsed.text?.match(otpPattern);
                  if (otpMatch && otpMatch[1]) {
                    logger.info('OTP found in email');
                    resolve(otpMatch[1]);
                    return;
                  }
                }
                logger.info('No OTP found in matching emails');
                resolve(null);
              } catch (error) {
                logger.error('Error checking email for OTP:', error);
                resolve(null);
              }
            });
            // Race the timeout against the actual operation
            return await Promise.race([checkPromise, timeoutPromise]);
          } catch (error) {
            logger.error('OTP retrieval failed:', error);
            throw error; // Rethrow for retry
          } finally {
            // Always close the connection if it was opened
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
            // Only retry on network errors or authentication issues
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
            logger.warn(`IMAP retry attempt ${attempt} after error:`, {
              error: error?.message || String(error),
            });
          },
        }
      );
    });
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    if ((error as any)?.name === 'CircuitOpenError') {
      logger.warn(`IMAP circuit is open: ${errorMessage}`);
    } else {
      logger.error('Error in checkEmailForOTP:', errorMessage);
    }
    return null;
  }
}

/**
 * Retrieves an OTP from an email account with retry and circuit breaker protection
 *
 * @param sender - Optional sender email to filter by
 * @param subject - Optional subject line to filter by
 * @param minutesAgo - How recent the email should be (in minutes)
 * @returns The OTP code or null if not found
 */
export async function getOTPFromEmail(
  sender?: string,
  subject?: string,
  minutesAgo: number = 5
): Promise<string | null> {
  try {
    // Get email configuration from environment variables
    const config: EmailOTPConfig = {
      user: process.env.OTP_EMAIL_USER || '',
      password: process.env.OTP_EMAIL_PASS || '',
      host: process.env.EMAIL_HOST || 'imap.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '993', 10),
      tls: process.env.EMAIL_TLS !== 'false',
      timeoutMs: 60000, // 1 minute timeout
      markSeen: true,
    };
    if (!config.user || !config.password) {
      logger.error('Missing email configuration for OTP retrieval');
      return null;
    }
    // Calculate the date for filtering recent emails
    const searchDate = new Date();
    searchDate.setMinutes(searchDate.getMinutes() - minutesAgo);
    // Build search criteria
    const criteria = ['UNSEEN', ['SINCE', searchDate]];
    if (sender) {
      criteria.push(['FROM', sender]);
    }
    if (subject) {
      criteria.push(['SUBJECT', subject]);
    }
    config.searchCriteria = { criteria };
    // Use retry for the entire operation
    return await retry(() => checkEmailForOTP(config), {
      retries: 5,
      minTimeout: 3000,
      factor: 1.5,
      jitter: true,
      maxRetryTime: 5 * 60 * 1000, // 5 minutes max
      retryIf: (error) => {
        // Only retry if error is not null (null means no OTP found, which is a valid result)
        return error !== null;
      },
      onRetry: (error, attempt) => {
        logger.info(`OTP retrieval retry attempt ${attempt}`, {
          sender,
          subject,
          minutesAgo,
        });
      },
    });
  } catch (error) {
    logger.error('Error retrieving OTP from email:', error);
    return null;
  }
}
