/**
 * Workflow Email Service
 * Handles sending emails for workflow events like completion, failure, etc.
 * 
 * This service provides the following functionality:
 * - Sending workflow summary emails
 * - Managing email notification settings
 * - Tracking email delivery status
 */
import { workflows, emailNotifications, emailLogs } from '../shared/schema.js';
import { db } from '../shared/db.js';
import { eq, and, desc, or, isNull } from 'drizzle-orm';
import { sendEmail, getEmailLogs as getEmailLogsFromMailer } from './fixed-mailerService.js';
import { 
  generateWorkflowSummaryHtml, 
  generateWorkflowSummaryText 
} from './emailTemplates.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default email configuration
 */
const DEFAULT_EMAIL_CONFIG = {
  fromName: 'Workflow System',
  fromEmail: 'noreply@example.com',
  subject: 'Workflow Summary Report'
};

/**
 * Send a workflow summary email
 */
export async function sendWorkflowSummaryEmail(options) {
  try {
    const { workflow, recipients, includeInsights = true } = options;
    
    // Format recipients as array
    const recipientsList = Array.isArray(recipients) ? recipients : [recipients];
    
    // Extract email-friendly data from workflow
    const emailData = await extractWorkflowData(workflow, includeInsights);
    
    // Generate email content
    const html = generateWorkflowSummaryHtml(emailData);
    const text = generateWorkflowSummaryText(emailData);
    
    // Configure email
    const subject = options.subject || `${DEFAULT_EMAIL_CONFIG.subject}: ${workflow.status.toUpperCase()}`;
    const fromName = options.fromName || DEFAULT_EMAIL_CONFIG.fromName;
    const fromEmail = options.fromEmail || DEFAULT_EMAIL_CONFIG.fromEmail;
    
    // Prepare recipient format for SendGrid
    const formattedRecipients = recipientsList.map(email => ({
      email,
      name: email.split('@')[0] // Use part before @ as name for simple personalization
    }));
    
    // Send the email
    await sendEmail({
      from: { name: fromName, email: fromEmail },
      to: formattedRecipients,
      content: {
        subject,
        html,
        text
      },
      workflowId: workflow.id
    });
    
    console.log(`Workflow summary email sent for workflow ${workflow.id} to ${recipientsList.join(', ')}`);
    return {
      success: true,
      message: `Email sent to ${recipientsList.join(', ')}`
    };
  } catch (error) {
    console.error('Failed to send workflow summary email:', error);
    return {
      success: false,
      message: 'Failed to send email',
      error: error.message
    };
  }
}

/**
 * Extract needed data from workflow for email template
 */
async function extractWorkflowData(workflow, includeInsights) {
  // Base data from workflow
  const data = {
    workflowId: workflow.id,
    workflowStatus: workflow.status,
    createdAt: workflow.createdAt,
    completedAt: workflow.lastUpdated,
  };
  
  // Extract context data if available
  if (workflow.context) {
    // Cast context to any to access dynamic properties
    const context = workflow.context;
    
    // Add summary if available
    if (context.summary) {
      data.summary = context.summary;
    } else if (context.__lastStepResult?.summary) {
      data.summary = context.__lastStepResult.summary;
    }
    
    // Add error if workflow failed
    if (workflow.status === 'failed' && workflow.lastError) {
      data.error = workflow.lastError;
    }
    
    // Extract insights if requested
    if (includeInsights) {
      // Try to find insights in context (common patterns)
      if (context.__lastStepResult?.insights) {
        data.insights = context.__lastStepResult.insights;
      } else if (context.insights) {
        data.insights = context.insights;
      }
      
      // If insights is not an array, convert to array
      if (data.insights && !Array.isArray(data.insights)) {
        data.insights = [data.insights];
      }
    }
  }
  
  return data;
}

/**
 * Send an email when a workflow completes
 * This is a convenience function for the common use case
 */
export async function sendWorkflowCompletionEmail(workflowId, recipients) {
  try {
    // Get the workflow from database
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      console.error(`Cannot send completion email: Workflow ${workflowId} not found`);
      return {
        success: false,
        message: `Workflow ${workflowId} not found`,
        error: 'Workflow not found'
      };
    }
    
    return await sendWorkflowSummaryEmail({
      workflow,
      recipients
    });
  } catch (error) {
    console.error(`Failed to send completion email for workflow ${workflowId}:`, error);
    return {
      success: false,
      message: 'Failed to send email',
      error: error.message
    };
  }
}

/**
 * Configure email notifications for a workflow
 * 
 * @param {object} settings - Email notification settings
 * @returns {object} Created notification settings
 */
export async function configureEmailNotifications(settings) {
  try {
    // Validate required fields
    if (!settings.recipientEmail) {
      throw new Error('Recipient email is required');
    }
    
    // Generate ID if not provided
    const id = settings.id || uuidv4();
    
    // Create or update notification settings
    const [notification] = await db
      .insert(emailNotifications)
      .values({
        id,
        workflowId: settings.workflowId,
        recipientEmail: settings.recipientEmail,
        sendOnCompletion: settings.sendOnCompletion ?? true,
        sendOnFailure: settings.sendOnFailure ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: emailNotifications.id,
        set: {
          workflowId: settings.workflowId,
          recipientEmail: settings.recipientEmail,
          sendOnCompletion: settings.sendOnCompletion ?? true,
          sendOnFailure: settings.sendOnFailure ?? true,
          updatedAt: new Date()
        }
      })
      .returning();
    
    console.log(`Email notification settings configured with ID: ${notification.id}`);
    return notification;
  } catch (error) {
    console.error('Failed to configure email notifications:', error);
    throw error;
  }
}

/**
 * Get email notification settings by various filters
 * 
 * @param {object} filters - Filters to apply
 * @returns {array} Matching notification settings
 */
export async function getEmailNotificationSettings(filters = {}) {
  try {
    let query = db.select().from(emailNotifications);
    
    // Apply filters if provided
    if (filters.id) {
      query = query.where(eq(emailNotifications.id, filters.id));
    }
    
    if (filters.workflowId) {
      query = query.where(eq(emailNotifications.workflowId, filters.workflowId));
    }
    
    // Execute query
    const settings = await query;
    return settings;
  } catch (error) {
    console.error('Failed to get email notification settings:', error);
    throw error;
  }
}

/**
 * Delete email notification settings by ID
 * 
 * @param {string} id - Notification settings ID
 * @returns {boolean} True if deleted, false if not found
 */
export async function deleteEmailNotificationSettings(id) {
  try {
    // Delete notification settings
    const result = await db
      .delete(emailNotifications)
      .where(eq(emailNotifications.id, id))
      .returning();
    
    const deleted = result.length > 0;
    if (deleted) {
      console.log(`Email notification settings with ID ${id} deleted`);
    } else {
      console.log(`Email notification settings with ID ${id} not found`);
    }
    
    return deleted;
  } catch (error) {
    console.error(`Failed to delete email notification settings ${id}:`, error);
    throw error;
  }
}

/**
 * Get email logs for a specific workflow
 * 
 * @param {string} workflowId - Workflow ID
 * @returns {array} Email logs for the workflow
 */
export async function getEmailLogs(workflowId) {
  try {
    return await getEmailLogsFromMailer(workflowId);
  } catch (error) {
    console.error(`Failed to get email logs for workflow ${workflowId}:`, error);
    throw error;
  }
}

/**
 * Retry sending a failed email
 * 
 * @param {string} emailLogId - Email log ID to retry
 * @returns {object} Updated email log
 */
export async function retryFailedEmail(emailLogId) {
  try {
    // Get the failed email log
    const [emailLog] = await db
      .select()
      .from(emailLogs)
      .where(and(
        eq(emailLogs.id, emailLogId),
        eq(emailLogs.status, 'failed')
      ));
    
    if (!emailLog) {
      throw new Error(`Email log ${emailLogId} not found or is not in 'failed' state`);
    }
    
    // Get the workflow associated with this email
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, emailLog.workflowId));
    
    if (!workflow) {
      throw new Error(`Workflow ${emailLog.workflowId} not found`);
    }
    
    // Send a new email based on this workflow
    console.log(`Retrying failed email ${emailLogId} for workflow ${workflow.id}`);
    const result = await sendWorkflowSummaryEmail({
      workflow,
      recipients: emailLog.recipients
    });
    
    return result;
  } catch (error) {
    console.error(`Failed to retry email ${emailLogId}:`, error);
    return {
      success: false,
      message: `Failed to retry email: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Process workflow status change and send notifications if configured
 * This function is called automatically when a workflow status changes
 * 
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<{success: boolean, sent: number, errors: number}>} Result of notification processing
 */
export async function processWorkflowStatusNotifications(workflowId) {
  try {
    console.log(`Processing email notifications for workflow ${workflowId}`);
    
    // Get the workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      console.warn(`Cannot process notifications: Workflow ${workflowId} not found`);
      return { success: false, sent: 0, errors: 0, message: 'Workflow not found' };
    }
    
    // Only process notifications for completed or failed workflows
    if (workflow.status !== 'completed' && workflow.status !== 'failed') {
      console.log(`Skipping notifications for workflow ${workflowId} with status ${workflow.status}`);
      return { success: true, sent: 0, errors: 0, message: 'Workflow not in completed or failed state' };
    }
    
    // Get notification settings for this specific workflow
    let notificationSettings = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));
    
    // If no specific notification found, get any global notification settings
    // (In a real-world app, we'd have a global settings table)
    
    // If no notification settings found, skip
    if (!notificationSettings || notificationSettings.length === 0) {
      console.log(`No notification settings found for workflow ${workflowId}`);
      return { success: true, sent: 0, errors: 0, message: 'No matching notification settings' };
    }
    
    console.log(`Found ${notificationSettings.length} notification settings for workflow ${workflowId}`);
    
    // Process each notification setting
    let sent = 0;
    let errors = 0;
    
    for (const setting of notificationSettings) {
      try {
        // Check if we should send notification based on workflow status
        const shouldSend = (
          (workflow.status === 'completed' && setting.sendOnCompletion) ||
          (workflow.status === 'failed' && setting.sendOnFailure)
        );
        
        if (!shouldSend) {
          console.log(`Skipping notification ${setting.id} based on workflow status ${workflow.status}`);
          continue;
        }
        
        // Send the notification
        console.log(`Sending notification to ${setting.recipients.join(', ')} for workflow ${workflowId}`);
        const result = await sendWorkflowSummaryEmail({
          workflow,
          recipients: setting.recipients,
          includeInsights: setting.includeInsights
        });
        
        if (result.success) {
          sent++;
        } else {
          errors++;
          console.error(`Failed to send notification: ${result.message}`);
        }
      } catch (error) {
        errors++;
        console.error(`Error processing notification ${setting.id}:`, error);
      }
    }
    
    console.log(`Notification processing completed for workflow ${workflowId}: sent=${sent}, errors=${errors}`);
    return { 
      success: true, 
      sent, 
      errors, 
      message: `Processed ${sent + errors} notifications with ${errors} errors` 
    };
  } catch (error) {
    console.error(`Failed to process workflow notifications for ${workflowId}:`, error);
    return { 
      success: false, 
      sent: 0, 
      errors: 1, 
      message: `Error processing notifications: ${error.message}`,
      error: error.message
    };
  }
}