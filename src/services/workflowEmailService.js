/**
 * Workflow Email Service
 * Handles email notifications for workflow completions using SendGrid
 */

import { db } from '../shared/db.js';
import { emailLogs, emailNotifications } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail, isConfigured as isMailerConfigured } from './mailerService.js';
import { generateWorkflowSummaryText, generateWorkflowSummaryHtml } from './emailTemplates.js';

// Max retries for email sending
const MAX_RETRIES = 3;

// Service state
let initialized = false;

/**
 * Initialize the email service
 */
export async function initializeEmailService() {
  if (!isMailerConfigured()) {
    console.warn('Mailer service is not configured. Email notifications will not be sent.');
    return false;
  }

  try {
    // Verify DB connection
    await db.execute('SELECT 1');
    initialized = true;
    console.log('Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    return false;
  }
}

/**
 * Configure email notifications for a workflow
 * @param {string} workflowId - The ID of the workflow
 * @param {string} recipientEmail - The email address to receive notifications
 * @param {object} options - Additional options for notifications
 * @returns {Promise<object>} The notification configuration
 */
export async function configureWorkflowNotifications(workflowId, recipientEmail, options = {}) {
  try {
    // Check if notification already exists
    const [existing] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));

    if (existing) {
      // Update existing notification
      const [updated] = await db
        .update(emailNotifications)
        .set({
          recipientEmail,
          sendOnCompletion: options.sendOnCompletion ?? true,
          sendOnFailure: options.sendOnFailure ?? true,
          updatedAt: new Date()
        })
        .where(eq(emailNotifications.id, existing.id))
        .returning();
      
      return updated;
    } else {
      // Create new notification
      const [created] = await db
        .insert(emailNotifications)
        .values({
          workflowId,
          recipientEmail,
          sendOnCompletion: options.sendOnCompletion ?? true,
          sendOnFailure: options.sendOnFailure ?? true
        })
        .returning();
      
      return created;
    }
  } catch (error) {
    console.error('Error configuring workflow notifications:', error);
    throw new Error(`Failed to configure workflow notifications: ${error.message}`);
  }
}

/**
 * Send email notifications for a completed or failed workflow
 * @param {string} workflowId - The ID of the workflow
 * @returns {Promise<object>} The result of the email sending operation
 */
export async function sendWorkflowNotifications(workflowId) {
  if (!initialized) {
    await initializeEmailService();
  }

  try {
    // Get workflow details
    const [workflow] = await db
      .select()
      .from('workflows')
      .where(eq('id', workflowId));

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Get notification configuration for this workflow
    const [notification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));

    if (!notification) {
      // No notifications configured for this workflow
      return { success: false, message: 'No notifications configured for this workflow' };
    }

    // Check if we should send an email based on workflow status
    const shouldSendEmail = 
      (workflow.status === 'completed' && notification.sendOnCompletion) ||
      (workflow.status === 'failed' && notification.sendOnFailure);

    if (!shouldSendEmail) {
      return { success: true, message: 'Notification skipped based on configuration' };
    }

    // Generate email content
    const emailSubject = `Workflow ${workflow.status === 'completed' ? 'Completed' : 'Failed'}: ${workflow.name || workflowId}`;
    const plainText = generateWorkflowSummaryText(workflow);
    const htmlContent = generateWorkflowSummaryHtml(workflow);

    // Track the email sending attempt
    const [emailLog] = await db
      .insert(emailLogs)
      .values({
        workflowId,
        recipientEmail: notification.recipientEmail,
        subject: emailSubject,
        status: 'pending',
        attempts: 1
      })
      .returning();

    // Send the email
    const result = await sendEmail({
      to: notification.recipientEmail,
      subject: emailSubject,
      text: plainText,
      html: htmlContent
    });

    // Update email log
    if (result.success) {
      await db
        .update(emailLogs)
        .set({
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(emailLogs.id, emailLog.id));

      return { 
        success: true, 
        message: 'Email notification sent successfully',
        emailId: emailLog.id
      };
    } else {
      await db
        .update(emailLogs)
        .set({
          status: 'failed',
          errorMessage: result.error || 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(emailLogs.id, emailLog.id));

      return { 
        success: false, 
        message: 'Failed to send email notification',
        error: result.error,
        emailId: emailLog.id
      };
    }
  } catch (error) {
    console.error('Error sending workflow notifications:', error);
    
    // Attempt to log the error
    try {
      await db
        .insert(emailLogs)
        .values({
          workflowId,
          subject: `Error sending workflow notification`,
          status: 'failed',
          errorMessage: error.message || 'Unknown error',
          attempts: 1
        });
    } catch (logError) {
      console.error('Failed to log email error:', logError);
    }

    return { 
      success: false, 
      message: 'Error sending workflow notification',
      error: error.message
    };
  }
}

/**
 * Retry failed email notifications
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<object>} Results of retry operation
 */
export async function retryFailedNotifications(maxRetries = MAX_RETRIES) {
  if (!initialized) {
    await initializeEmailService();
  }

  try {
    // Find failed email logs that haven't exceeded max retries
    const failedEmails = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.status, 'failed'))
      .where(db.sql`${emailLogs.attempts} < ${maxRetries}`);

    if (failedEmails.length === 0) {
      return { success: true, message: 'No failed emails to retry', count: 0 };
    }

    const results = {
      total: failedEmails.length,
      success: 0,
      failed: 0,
      details: []
    };

    // Process each failed email
    for (const emailLog of failedEmails) {
      try {
        // Get workflow details
        const [workflow] = await db
          .select()
          .from('workflows')
          .where(eq('id', emailLog.workflowId));

        if (!workflow) {
          results.failed++;
          results.details.push({
            emailId: emailLog.id,
            success: false,
            message: 'Workflow not found'
          });
          continue;
        }

        // Generate email content
        const plainText = generateWorkflowSummaryText(workflow);
        const htmlContent = generateWorkflowSummaryHtml(workflow);

        // Send the email
        const result = await sendEmail({
          to: emailLog.recipientEmail,
          subject: emailLog.subject,
          text: plainText,
          html: htmlContent
        });

        // Update email log
        if (result.success) {
          await db
            .update(emailLogs)
            .set({
              status: 'sent',
              sentAt: new Date(),
              attempts: emailLog.attempts + 1,
              updatedAt: new Date()
            })
            .where(eq(emailLogs.id, emailLog.id));

          results.success++;
          results.details.push({
            emailId: emailLog.id,
            success: true
          });
        } else {
          await db
            .update(emailLogs)
            .set({
              attempts: emailLog.attempts + 1,
              errorMessage: result.error || 'Unknown error',
              updatedAt: new Date()
            })
            .where(eq(emailLogs.id, emailLog.id));

          results.failed++;
          results.details.push({
            emailId: emailLog.id,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          emailId: emailLog.id,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Retried ${results.total} emails: ${results.success} succeeded, ${results.failed} failed`,
      results
    };
  } catch (error) {
    console.error('Error retrying failed notifications:', error);
    return {
      success: false,
      message: 'Error retrying failed notifications',
      error: error.message
    };
  }
}

/**
 * Check if email service is properly initialized
 * @returns {boolean} True if service is initialized
 */
export function isInitialized() {
  return initialized;
}