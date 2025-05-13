/**
 * Mailer Service
 * 
 * This service handles sending emails using SendGrid with a fallback to Nodemailer.
 * It provides a unified interface for email delivery with logging and retry capabilities.
 */

import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid mailer service initialized successfully');
} else {
  console.warn('SendGrid API key not found, will use Nodemailer fallback');
}

// Fallback Nodemailer transport
let nodemailerTransport;

/**
 * Create a Nodemailer test account for fallback
 * @returns {Promise<nodemailer.Transporter>} Configured transport
 */
async function createNodemailerTransport() {
  if (nodemailerTransport) {
    return nodemailerTransport;
  }
  
  try {
    // Create a test account if needed
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      const testAccount = await nodemailer.createTestAccount();
      console.log('Nodemailer test account created for fallback');
      
      nodemailerTransport = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } else {
      // Use configured email settings
      nodemailerTransport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
    
    return nodemailerTransport;
  } catch (error) {
    console.error('Error creating Nodemailer transport:', error.message);
    throw new Error('Failed to initialize email service');
  }
}

/**
 * Send an email using SendGrid with Nodemailer fallback
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @param {string} [options.from] - Sender email (optional, uses default if not provided)
 * @returns {Promise<Object>} Email sending result
 */
export async function sendEmail(options) {
  // Default from address if not provided
  const from = options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com';
  
  // Try SendGrid first if configured
  if (process.env.SENDGRID_API_KEY) {
    try {
      const msg = {
        to: options.to,
        from,
        subject: options.subject,
        text: options.text,
        html: options.html
      };
      
      await sgMail.send(msg);
      
      return {
        success: true,
        message: 'Email sent via SendGrid',
        provider: 'sendgrid',
        emailId: `sg_${Date.now()}`
      };
    } catch (error) {
      console.error('SendGrid error:', error);
      console.log('Falling back to Nodemailer');
      // Fall back to Nodemailer
    }
  }
  
  // Use Nodemailer as fallback
  try {
    const transport = await createNodemailerTransport();
    
    const info = await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });
    
    console.log('Email sent via Nodemailer fallback');
    if (info.messageId && info.previewUrl) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      message: 'Email sent via Nodemailer',
      provider: 'nodemailer',
      emailId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error('Nodemailer error:', error.message);
    return {
      success: false,
      message: `Failed to send email: ${error.message}`,
      provider: null,
      emailId: null
    };
  }
}

/**
 * Send a test email
 * 
 * @param {string} to - Recipient email
 * @returns {Promise<Object>} Test result
 */
export async function sendTestEmail(to) {
  return sendEmail({
    to,
    subject: 'Test Email from Insight Engine',
    text: 'This is a test email from the Insight Engine system.',
    html: '<h1>Test Email</h1><p>This is a test email from the Insight Engine system.</p>'
  });
}