/**
 * Fixed Mailer Service
 * Provides a simplified interface for sending emails via SendGrid
 * with fallback to nodemailer for development/testing
 */

import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../shared/db.js';
import { emailLogs } from '../shared/schema.js';

// Mailer configuration
let mailerConfig = {
  provider: 'sendgrid',
  apiKey: null,
  defaultFrom: 'noreply@example.com',
  defaultFromName: 'Workflow System',
  useNodemailerFallback: true,
  testAccount: null
};

// Nodemailer test account for fallback
let testTransporter = null;

/**
 * Initialize the mailer service with api key and options
 */
export async function initializeMailer(apiKey, options = {}) {
  // Configure SendGrid
  if (apiKey) {
    sgMail.setApiKey(apiKey);
    mailerConfig.apiKey = apiKey;
    mailerConfig.provider = 'sendgrid';
    console.log('SendGrid mailer service initialized successfully');
  } else {
    console.warn('No SendGrid API key provided, will use Nodemailer fallback if enabled');
    mailerConfig.provider = 'nodemailer';
  }
  
  // Apply any custom options
  if (options.defaultFrom) mailerConfig.defaultFrom = options.defaultFrom;
  if (options.defaultFromName) mailerConfig.defaultFromName = options.defaultFromName;
  if (options.useNodemailerFallback !== undefined) mailerConfig.useNodemailerFallback = options.useNodemailerFallback;
  
  // Set up nodemailer test account if needed for fallback
  if (mailerConfig.provider === 'nodemailer' || mailerConfig.useNodemailerFallback) {
    try {
      // Create a testing account for etheral.email if no SMTP is configured
      const testAccount = await nodemailer.createTestAccount();
      testTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      mailerConfig.testAccount = testAccount;
      console.log('Nodemailer test account created for fallback');
    } catch (error) {
      console.error('Failed to create nodemailer test account:', error);
    }
  }
}

/**
 * Send an email
 * @param {object} params Email parameters
 * @param {string|object} params.to Recipient email or array of recipient objects
 * @param {string|object} [params.from] From email address or object
 * @param {object} params.content Email content with subject, text, html
 * @param {string} [params.workflowId] Optional workflow ID for logging
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, previewUrl?: string}>}
 */
export async function sendEmail(params) {
  try {
    const { to, from, content, workflowId } = params;
    
    // Format the recipient(s)
    let recipients;
    if (typeof to === 'string') {
      recipients = to;
    } else if (Array.isArray(to)) {
      // Extract emails for record-keeping
      recipients = to.map(r => typeof r === 'string' ? r : r.email).join(', ');
    } else if (typeof to === 'object' && to.email) {
      recipients = to.email;
    } else {
      throw new Error('Invalid recipient format');
    }
    
    // Format the from address
    const fromAddress = from || {
      email: mailerConfig.defaultFrom,
      name: mailerConfig.defaultFromName
    };
    
    const formattedFrom = typeof fromAddress === 'string' 
      ? fromAddress 
      : `${fromAddress.name} <${fromAddress.email}>`;
    
    // Create an email log entry
    const [logEntry] = await db
      .insert(emailLogs)
      .values({
        id: uuidv4(),
        workflowId: workflowId || null,
        recipientEmail: recipients,
        subject: content.subject,
        status: 'pending',
        attempts: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Try to send with SendGrid first
    if (mailerConfig.provider === 'sendgrid' && mailerConfig.apiKey) {
      try {
        const msg = {
          to: to,
          from: fromAddress,
          subject: content.subject,
          text: content.text || '',
          html: content.html || ''
        };
        
        const response = await sgMail.send(msg);
        
        // Update the log with success
        await db
          .update(emailLogs)
          .set({
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date()
          })
          .where('id', logEntry.id);
        
        return {
          success: true,
          messageId: Array.isArray(response) ? response[0]?.messageId : null,
          logId: logEntry.id
        };
      } catch (sgError) {
        console.error('SendGrid error:', sgError);
        
        // Only try nodemailer fallback if explicitly enabled
        if (!mailerConfig.useNodemailerFallback) {
          // Update log with error
          await db
            .update(emailLogs)
            .set({
              status: 'failed',
              errorMessage: sgError.message || 'SendGrid error',
              updatedAt: new Date()
            })
            .where('id', logEntry.id);
          
          throw sgError;
        }
        
        // If we get here, we'll try the nodemailer fallback next
        console.log('Falling back to Nodemailer');
      }
    }
    
    // Fallback to Nodemailer (or primary if SendGrid not configured)
    if (testTransporter) {
      const mail = {
        from: formattedFrom,
        to: recipients,
        subject: content.subject,
        text: content.text || '',
        html: content.html || ''
      };
      
      const info = await testTransporter.sendMail(mail);
      
      // Update the log with success
      await db
        .update(emailLogs)
        .set({
          status: 'sent',
          sentAt: new Date(),
          providerMessageId: info.messageId,
          updatedAt: new Date()
        })
        .where('id', logEntry.id);
      
      console.log('Email sent via Nodemailer fallback');
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
        logId: logEntry.id
      };
    }
    
    // If we get here, both methods failed or weren't configured
    throw new Error('No email provider available');
    
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Try to update the email log if we have the ID
    try {
      if (params.logId) {
        await db
          .update(emailLogs)
          .set({
            status: 'failed',
            errorMessage: error.message || 'Unknown error',
            updatedAt: new Date()
          })
          .where('id', params.logId);
      }
    } catch (logError) {
      console.error('Failed to update email log:', logError);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}