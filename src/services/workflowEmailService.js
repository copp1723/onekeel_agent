/**
 * Workflow Email Service
 * Handles sending email notifications for workflow completions
 */

import { db } from '../shared/db.js';
import { workflows, emailLogs, emailNotifications } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { sendEmail } from './mailerService.js';
import { generateWorkflowSummaryText, generateWorkflowSummaryHtml } from './emailTemplates.js';

/**
 * Send a workflow completion email
 * @param {string} workflowId - The ID of the completed workflow
 * @param {string} [recipientOverride] - Optional override for recipient email
 * @returns {Promise<{success: boolean, message: string, emailId?: string, error?: string}>} Result of the email sending operation
 */
export async function sendWorkflowCompletionEmail(workflowId, recipientOverride) {
  try {
    // Get workflow details
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Determine recipient(s)
    let recipient;

    if (recipientOverride) {
      // Use the override if provided
      recipient = Array.isArray(recipientOverride) ? recipientOverride[0] : recipientOverride;
    } else {
      // Look up the workflow notification settings
      const [notification] = await db
        .select()
        .from(emailNotifications)
        .where(eq(emailNotifications.workflowId, workflowId));

      if (!notification) {
        return {
          success: false,
          message: 'No notification settings found for this workflow'
        };
      }

      // Check if we should send based on workflow status
      if ((workflow.status === 'completed' && !notification.sendOnCompletion) ||
          (workflow.status === 'failed' && !notification.sendOnFailure)) {
        return {
          success: false,
          message: 'Notification not configured for this workflow status'
        };
      }

      recipient = notification.recipientEmail;
    }

    if (!recipient) {
      return {
        success: false,
        message: 'No recipient email found'
      };
    }

    // Generate email content
    const subject = `Workflow ${workflow.status === 'completed' ? 'Completed' : 'Failed'}: ${workflow.id}`;
    const plainText = generateWorkflowSummaryText(workflow);
    const htmlContent = generateWorkflowSummaryHtml(workflow);

    // Create an email log entry
    const [emailLog] = await db
      .insert(emailLogs)
      .values({
        workflowId: workflow.id,
        recipientEmail: recipient,
        subject,
        status: 'pending',
        attempts: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Send the email
    const emailResult = await sendEmail({
      to: recipient,
      subject,
      text: plainText,
      html: htmlContent
    });

    // Update the email log with the result
    if (emailResult.success) {
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
        message: 'Email sent successfully',
        emailId: emailLog.id
      };
    } else {
      await db
        .update(emailLogs)
        .set({
          status: 'failed',
          errorMessage: emailResult.error,
          updatedAt: new Date()
        })
        .where(eq(emailLogs.id, emailLog.id));

      return {
        success: false,
        message: 'Failed to send email',
        error: emailResult.error,
        emailId: emailLog.id
      };
    }
  } catch (error) {
    console.error('Error sending workflow completion email:', error);
    
    try {
      // Log the error
      await db
        .insert(emailLogs)
        .values({
          workflowId,
          recipientEmail: 'error-log',
          subject: 'Error sending workflow notification',
          status: 'failed',
          errorMessage: error.message || 'Unknown error',
          createdAt: new Date(),
          updatedAt: new Date()
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
 * Configure email notifications for a workflow
 * @param {string} workflowId - The ID of the workflow
 * @param {string} recipientEmail - The email address to receive notifications
 * @param {object} options - Additional options for notifications
 * @returns {Promise<{success: boolean, notification?: object, message: string, error?: string}>} The notification configuration
 */
export async function configureEmailNotifications(workflowId, recipientEmail, options = {}) {
  try {
    // Check if the workflow exists
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

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
          sendOnCompletion: options.sendOnCompletion !== undefined ? options.sendOnCompletion : true,
          sendOnFailure: options.sendOnFailure !== undefined ? options.sendOnFailure : true,
          updatedAt: new Date()
        })
        .where(eq(emailNotifications.id, existing.id))
        .returning();

      return {
        success: true,
        notification: updated,
        message: 'Email notification updated'
      };
    } else {
      // Create new notification
      const [created] = await db
        .insert(emailNotifications)
        .values({
          workflowId,
          recipientEmail,
          sendOnCompletion: options.sendOnCompletion !== undefined ? options.sendOnCompletion : true,
          sendOnFailure: options.sendOnFailure !== undefined ? options.sendOnFailure : true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return {
        success: true,
        notification: created,
        message: 'Email notification created'
      };
    }
  } catch (error) {
    console.error('Error configuring email notifications:', error);
    return {
      success: false,
      message: 'Failed to configure email notifications',
      error: error.message
    };
  }
}

/**
 * Get email notification settings for a workflow
 * @param {string} workflowId - The ID of the workflow
 * @returns {Promise<object|null>} The notification settings or null if not found
 */
export async function getEmailNotificationSettings(workflowId) {
  try {
    const [notification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));

    return notification || null;
  } catch (error) {
    console.error('Error getting email notification settings:', error);
    throw error;
  }
}

/**
 * Delete email notification settings for a workflow
 * @param {string} workflowId - The ID of the workflow
 * @returns {Promise<boolean>} True if successful
 */
export async function deleteEmailNotificationSettings(workflowId) {
  try {
    await db
      .delete(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));

    return true;
  } catch (error) {
    console.error('Error deleting email notification settings:', error);
    throw error;
  }
}

/**
 * Get email logs for a workflow
 * @param {string} workflowId - The ID of the workflow
 * @returns {Promise<Array>} Array of email logs
 */
export async function getEmailLogs(workflowId) {
  try {
    const logs = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.workflowId, workflowId))
      .orderBy(emailLogs.createdAt);

    return logs;
  } catch (error) {
    console.error('Error getting email logs:', error);
    throw error;
  }
}

/**
 * Retry failed email for a workflow
 * @param {string} emailLogId - The ID of the email log
 * @returns {Promise<object>} Result of the retry operation
 */
export async function retryFailedEmail(emailLogId) {
  try {
    // Get the email log
    const [emailLog] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, emailLogId));

    if (!emailLog) {
      throw new Error(`Email log ${emailLogId} not found`);
    }

    if (emailLog.status !== 'failed') {
      return {
        success: false,
        message: `Email is not in failed state (current: ${emailLog.status})`
      };
    }

    // Get workflow details
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, emailLog.workflowId));

    if (!workflow) {
      throw new Error(`Workflow ${emailLog.workflowId} not found`);
    }

    // Generate email content
    const plainText = generateWorkflowSummaryText(workflow);
    const htmlContent = generateWorkflowSummaryHtml(workflow);

    // Send the email
    const emailResult = await sendEmail({
      to: emailLog.recipientEmail,
      subject: emailLog.subject,
      text: plainText,
      html: htmlContent
    });

    // Update the email log with the result
    if (emailResult.success) {
      const [updatedLog] = await db
        .update(emailLogs)
        .set({
          status: 'sent',
          sentAt: new Date(),
          attempts: emailLog.attempts + 1,
          updatedAt: new Date()
        })
        .where(eq(emailLogs.id, emailLogId))
        .returning();

      return {
        success: true,
        message: 'Email sent successfully',
        emailLog: updatedLog
      };
    } else {
      const [updatedLog] = await db
        .update(emailLogs)
        .set({
          attempts: emailLog.attempts + 1,
          errorMessage: emailResult.error,
          updatedAt: new Date()
        })
        .where(eq(emailLogs.id, emailLogId))
        .returning();

      return {
        success: false,
        message: 'Failed to send email',
        error: emailResult.error,
        emailLog: updatedLog
      };
    }
  } catch (error) {
    console.error('Error retrying failed email:', error);
    return {
      success: false,
      message: 'Error retrying failed email',
      error: error.message
    };
  }
}