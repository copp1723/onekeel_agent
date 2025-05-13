/**
 * Workflow Email Service
 * Handles sending email notifications for workflow completions
 */

import { db } from '../shared/db.js';
import { workflows, emailLogs, emailNotifications } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';

// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Simple placeholder functions for email templates
const generateWorkflowSummaryText = (workflow) => {
  return `Workflow ID: ${workflow.id}\nStatus: ${workflow.status}\nCreated: ${workflow.createdAt}\nUpdated: ${workflow.updatedAt}`;
};

const generateWorkflowSummaryHtml = (workflow) => {
  return `<h1>Workflow Summary</h1>
<p><strong>ID:</strong> ${workflow.id}</p>
<p><strong>Status:</strong> ${workflow.status}</p>
<p><strong>Created:</strong> ${workflow.createdAt}</p>
<p><strong>Updated:</strong> ${workflow.updatedAt}</p>`;
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @returns {Promise<Object>} Result of sending the email
 */
export async function sendEmail(options) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'workflow@example.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Configure email notifications for a workflow
 * @param {string} workflowId - The ID of the workflow
 * @param {Object} config - Notification configuration
 * @returns {Promise<Object>} The created notification
 */
export async function configureNotification(workflowId, config) {
  const [notification] = await db.insert(emailNotifications)
    .values({
      workflowId,
      recipientEmail: config.recipientEmail,
      sendOnCompletion: config.sendOnCompletion ?? true,
      sendOnFailure: config.sendOnFailure ?? true
    })
    .returning();
  
  return notification;
}

/**
 * Get notification settings for a workflow
 * @param {string} workflowId - The ID of the workflow
 * @returns {Promise<Object|null>} The notification settings
 */
export async function getNotificationSettings(workflowId) {
  const [settings] = await db.select()
    .from(emailNotifications)
    .where(eq(emailNotifications.workflowId, workflowId));
  
  return settings;
}

/**
 * Delete notification settings for a workflow
 * @param {string} workflowId - The ID of the workflow
 * @returns {Promise<Object>} Result of the deletion
 */
export async function deleteNotification(workflowId) {
  const result = await db.delete(emailNotifications)
    .where(eq(emailNotifications.workflowId, workflowId))
    .returning();
  
  return { success: true, deleted: result.length > 0 };
}

/**
 * Get email logs for a workflow
 * @param {string} workflowId - The ID of the workflow
 * @returns {Promise<Array>} The email logs
 */
export async function getEmailLogs(workflowId) {
  return db.select()
    .from(emailLogs)
    .where(eq(emailLogs.workflowId, workflowId))
    .orderBy(emailLogs.createdAt);
}

/**
 * Retry sending an email
 * @param {string} emailLogId - The ID of the email log
 * @returns {Promise<Object>} Result of sending the email
 */
export async function retryEmail(emailLogId) {
  const [log] = await db.select()
    .from(emailLogs)
    .where(eq(emailLogs.id, emailLogId));
  
  if (!log) {
    throw new Error('Email log not found');
  }
  
  return sendWorkflowEmail(log.workflowId, log.recipientEmail);
}

/**
 * Send a workflow email
 * @param {string} workflowId - The ID of the workflow
 * @param {string} recipientEmail - The recipient email
 * @returns {Promise<Object>} Result of sending the email
 */
export async function sendWorkflowEmail(workflowId, recipientEmail) {
  try {
    const [workflow] = await db.select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    const emailContent = generateWorkflowSummaryHtml(workflow);
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'workflow@example.com',
      to: recipientEmail,
      subject: `Workflow ${workflowId} Update`,
      html: emailContent
    });
    
    const [log] = await db.insert(emailLogs)
      .values({
        workflowId,
        recipientEmail,
        subject: `Workflow ${workflowId} Update`,
        status: 'sent',
        sentAt: new Date()
      })
      .returning();
    
    return {
      success: true,
      message: 'Email sent successfully',
      emailId: log.id
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

/**
 * Send a workflow completion email
 * @param {string} workflowId - The ID of the workflow
 * @param {string} [recipientOverride] - Optional recipient override
 * @returns {Promise<Object>} Result of sending the email
 */
export async function sendWorkflowCompletionEmail(workflowId, recipientOverride) {
  try {
    const [workflow] = await db.select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    let recipient;
    
    if (recipientOverride) {
      recipient = recipientOverride;
    } else {
      const [notification] = await db.select()
        .from(emailNotifications)
        .where(eq(emailNotifications.workflowId, workflowId));
      
      if (!notification) {
        return {
          success: false,
          message: 'No notification settings found for this workflow'
        };
      }
      
      recipient = notification.recipientEmail;
    }
    
    const subject = `Workflow ${workflow.status === 'completed' ? 'Completed' : 'Failed'}: ${workflow.id}`;
    const plainText = generateWorkflowSummaryText(workflow);
    const htmlContent = generateWorkflowSummaryHtml(workflow);
    
    const emailResult = await sendEmail({
      to: recipient,
      subject,
      text: plainText,
      html: htmlContent
    });
    
    if (emailResult.success) {
      const [log] = await db.insert(emailLogs)
        .values({
          workflowId,
          recipientEmail: recipient,
          subject,
          status: 'sent',
          sentAt: new Date()
        })
        .returning();
      
      return {
        success: true,
        message: 'Email sent successfully',
        emailId: log.id
      };
    } else {
      return {
        success: false,
        message: 'Failed to send email',
        error: emailResult.error
      };
    }
  } catch (error) {
    console.error('Error sending workflow completion email:', error);
    return {
      success: false,
      message: 'Error sending workflow notification',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
