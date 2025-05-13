import imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

/**
 * Sends an OTP to the specified email address
 * @param {string} email - Recipient email address
 * @param {Object} config - Email configuration
 * @returns {Promise<string>} Hashed OTP with expiry time
 */
export async function sendOTP(email, config) {
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

/**
 * Verifies an OTP against a stored hash
 * @param {string} inputOTP - The OTP to verify
 * @param {string} hashedOTPWithExpiry - Stored hashed OTP with expiry
 * @returns {boolean} Whether the OTP is valid
 */
export function verifyOTP(inputOTP, hashedOTPWithExpiry) {
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

/**
 * Checks emails for an OTP and returns it
 * @param {Object} config - Email configuration
 * @param {Object} searchCriteria - Search criteria for emails
 * @returns {Promise<string|null>} The OTP if found, null otherwise
 */
export async function checkEmailForOTP(config, searchCriteria = {}) {
  try {
    const connection = await imap.connect({
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

    const searchResults = await connection.search(searchCriteria.criteria || defaultCriteria);

    if (searchResults.length === 0) {
      await connection.end();
      return null;
    }

    const messages = await connection.search(searchResults, {
      bodies: ['HEADER', 'TEXT'],
      markSeen: true
    });

    // Process fetched messages
    for (const message of messages) {
      const all = message.parts.find(part => part.which === 'TEXT');
      const parsed = await simpleParser(all?.body || '');

      // Extract OTP using regex - modify pattern based on your email format
      const otpMatch = parsed.text?.match(/OTP is: (\d{6})/);
      if (otpMatch && otpMatch[1]) {
        await connection.end();
        return otpMatch[1];
      }
    }

    await connection.end();
    return null;
  } catch (error) {
    console.error('Error checking email for OTP:', error);
    return null;
  }
}

/**
 * Retrieves an OTP from an email account
 * @param {string} emailUser - Email username/address 
 * @returns {Promise<string|null>} The OTP if found, null otherwise
 */
export async function getOTPFromEmail(emailUser) {
  if (!emailUser) {
    console.error('Email user not provided for OTP retrieval');
    return null;
  }
  
  // Get email configuration from environment variables
  const config = {
    user: process.env.OTP_EMAIL_USER || emailUser,
    password: process.env.OTP_EMAIL_PASS || '',
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '993', 10),
    tls: process.env.EMAIL_TLS !== 'false'
  };
  
  if (!config.password || !config.host) {
    console.error('Missing email configuration for OTP retrieval');
    return null;
  }
  
  // Default search criteria for OTP emails
  const searchCriteria = {
    criteria: [
      'UNSEEN',
      ['SINCE', new Date(Date.now() - 10 * 60 * 1000)] // Last 10 minutes
    ]
  };
  
  return await checkEmailForOTP(config, searchCriteria);
}