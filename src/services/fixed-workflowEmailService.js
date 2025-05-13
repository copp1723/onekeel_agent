/**
 * Fixed Workflow Email Service
 * Handles sending email notifications related to workflow events
 * Uses the fixed-mailerService for reliable email delivery
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../shared/db.js';
import { workflows, emailNotifications, emailLogs } from '../shared/schema.js';
import { sendEmail } from './fixed-mailerService.js';
import { eq, and } from 'drizzle-orm';

// Default templates
const DEFAULT_TEMPLATES = {
  completion: {
    subject: 'Workflow Completed: {{workflowName}}',
    text: 'Your workflow "{{workflowName}}" has completed successfully.\n\n'
      + 'Summary: {{summary}}\n\n'
      + 'Insights:\n{{insights}}\n\n'
      + 'Workflow ID: {{workflowId}}\n'
      + 'Completed at: {{completedAt}}\n',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4CAF50;">Workflow Completed: {{workflowName}}</h2>
        <p>Your workflow has completed successfully.</p>
        
        <h3 style="margin-top: 20px;">Summary</h3>
        <p>{{summary}}</p>
        
        <h3 style="margin-top: 20px;">Insights</h3>
        <ul>
          {{#each insights}}
            <li>{{this}}</li>
          {{/each}}
        </ul>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #757575;">
          <p>Workflow ID: {{workflowId}}<br>
          Completed at: {{completedAt}}</p>
        </div>
      </div>
    `
  },
  failure: {
    subject: 'Workflow Failed: {{workflowName}}',
    text: 'Your workflow "{{workflowName}}" has failed.\n\n'
      + 'Error: {{error}}\n\n'
      + 'Workflow ID: {{workflowId}}\n'
      + 'Failed at: {{failedAt}}\n',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #F44336;">Workflow Failed: {{workflowName}}</h2>
        <p>Unfortunately, your workflow has failed.</p>
        
        <h3 style="margin-top: 20px;">Error Details</h3>
        <p style="background-color: #FFEBEE; padding: 10px; border-radius: 4px;">{{error}}</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #757575;">
          <p>Workflow ID: {{workflowId}}<br>
          Failed at: {{failedAt}}</p>
        </div>
      </div>
    `
  }
};

/**
 * Configure email notifications for a workflow
 * @param {object} params Configuration parameters
 * @param {string} params.workflowId ID of the workflow to configure notifications for
 * @param {string} params.recipientEmail Email address to send notifications to
 * @param {boolean} [params.sendOnCompletion=true] Send notifications on workflow completion
 * @param {boolean} [params.sendOnFailure=true] Send notifications on workflow failure
 * @returns {Promise<object>} The created notification settings
 */
export async function configureEmailNotifications(params) {
  const { workflowId, recipientEmail, sendOnCompletion = true, sendOnFailure = true } = params;
  
  try {
    // Validate workflow exists
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }
    
    // Check for existing notifications for this workflow
    const [existingNotification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));
    
    if (existingNotification) {
      // Update existing notification
      const [updatedNotification] = await db
        .update(emailNotifications)
        .set({
          recipientEmail,
          sendOnCompletion,
          sendOnFailure,
          updatedAt: new Date()
        })
        .where(eq(emailNotifications.id, existingNotification.id))
        .returning();
      
      return updatedNotification;
    } else {
      // Create new notification
      const [newNotification] = await db
        .insert(emailNotifications)
        .values({
          id: uuidv4(),
          workflowId,
          recipientEmail,
          sendOnCompletion,
          sendOnFailure,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newNotification;
    }
  } catch (error) {
    console.error(`Error configuring email notifications:`, error);
    throw error;
  }
}

/**
 * Get email notification settings for a workflow
 * @param {string} workflowId ID of the workflow
 * @returns {Promise<object|null>} Notification settings or null if none exist
 */
export async function getEmailNotificationSettings(workflowId) {
  try {
    const [notification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));
    
    return notification || null;
  } catch (error) {
    console.error(`Error getting email notification settings:`, error);
    throw error;
  }
}

/**
 * Delete email notification settings for a workflow
 * @param {string} workflowId ID of the workflow
 * @returns {Promise<boolean>} True if settings were deleted, false if they didn't exist
 */
export async function deleteEmailNotificationSettings(workflowId) {
  try {
    const result = await db
      .delete(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));
    
    return result.count > 0;
  } catch (error) {
    console.error(`Error deleting email notification settings:`, error);
    throw error;
  }
}

/**
 * Get email logs for a workflow
 * @param {string} workflowId ID of the workflow
 * @returns {Promise<Array>} Array of email log entries
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
    console.error(`Error getting email logs:`, error);
    throw error;
  }
}

/**
 * Retry sending a failed email
 * @param {string} emailLogId ID of the failed email log entry
 * @returns {Promise<object>} Result of the retry attempt
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
      throw new Error(`Email is not in failed state (current: ${emailLog.status})`);
    }
    
    // Get workflow details
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, emailLog.workflowId));
    
    if (!workflow) {
      throw new Error(`Workflow ${emailLog.workflowId} not found`);
    }
    
    // Send the email
    const result = await sendWorkflowCompletionEmail(
      workflow.id,
      emailLog.recipientEmail
    );
    
    return result;
  } catch (error) {
    console.error(`Error retrying failed email:`, error);
    throw error;
  }
}

/**
 * Send a workflow completion email
 * @param {string} workflowId ID of the completed workflow
 * @param {string} recipientEmail Email address to send to
 * @returns {Promise<object>} Result of the send operation
 */
export async function sendWorkflowCompletionEmail(workflowId, recipientEmail) {
  try {
    // Get workflow details
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      return {
        success: false,
        error: `Workflow ${workflowId} not found`
      };
    }
    
    // Format the context data for the email
    const context = workflow.context || {};
    const insights = context.insights || [];
    const summary = context.summary || 'No summary available';
    
    // Generate email content
    const emailContent = {
      subject: `Workflow Completed: ${workflow.name}`,
      text: generateWorkflowSummaryText(workflow),
      html: generateWorkflowSummaryHtml(workflow)
    };
    
    // Send the email
    const result = await sendEmail({
      to: recipientEmail,
      content: emailContent,
      workflowId: workflow.id
    });
    
    return result;
  } catch (error) {
    console.error(`Error sending workflow completion email:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process email notifications for a workflow based on its status
 * This function is called automatically when workflow status changes
 * 
 * @param {string} workflowId ID of the workflow
 * @returns {Promise<object>} Result of the notification processing
 */
export async function processWorkflowStatusNotifications(workflowId) {
  try {
    // Get workflow details
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      return {
        success: false,
        message: `Workflow ${workflowId} not found`,
        sent: 0
      };
    }
    
    // Get notification settings
    const [notification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));
    
    if (!notification) {
      return {
        success: true,
        message: 'No email notification settings configured for this workflow',
        sent: 0
      };
    }
    
    // Check workflow status and notification settings to determine if email should be sent
    let shouldSendEmail = false;
    let emailType = '';
    
    if (workflow.status === 'completed' && notification.sendOnCompletion) {
      shouldSendEmail = true;
      emailType = 'completion';
    } else if (workflow.status === 'failed' && notification.sendOnFailure) {
      shouldSendEmail = true;
      emailType = 'failure';
    }
    
    if (!shouldSendEmail) {
      return {
        success: true,
        message: `No email needed for status ${workflow.status}`,
        sent: 0
      };
    }
    
    // Send the appropriate email
    let result;
    if (emailType === 'completion') {
      result = await sendWorkflowCompletionEmail(workflowId, notification.recipientEmail);
    } else if (emailType === 'failure') {
      result = await sendWorkflowFailureEmail(workflowId, notification.recipientEmail);
    }
    
    return {
      success: result.success,
      message: result.success ? 'Email notification sent' : `Failed to send email: ${result.error}`,
      sent: result.success ? 1 : 0,
      emailType,
      logId: result.logId
    };
    
  } catch (error) {
    console.error(`Error processing workflow status notifications:`, error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      sent: 0
    };
  }
}

/**
 * Send a workflow failure email
 * @param {string} workflowId ID of the failed workflow
 * @param {string} recipientEmail Email address to send to
 * @returns {Promise<object>} Result of the send operation
 */
export async function sendWorkflowFailureEmail(workflowId, recipientEmail) {
  try {
    // Get workflow details
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      return {
        success: false,
        error: `Workflow ${workflowId} not found`
      };
    }
    
    // Format the error message
    const errorMessage = workflow.lastError || 'Unknown error occurred';
    
    // Generate email content
    const emailContent = {
      subject: `Workflow Failed: ${workflow.name}`,
      text: generateWorkflowFailureText(workflow),
      html: generateWorkflowFailureHtml(workflow)
    };
    
    // Send the email
    const result = await sendEmail({
      to: recipientEmail,
      content: emailContent,
      workflowId: workflow.id
    });
    
    return result;
  } catch (error) {
    console.error(`Error sending workflow failure email:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate plain text email content for a completed workflow
 * @param {object} workflow The workflow object
 * @returns {string} Formatted plain text email content
 */
function generateWorkflowSummaryText(workflow) {
  const context = workflow.context || {};
  const insights = context.insights || [];
  const summary = context.summary || 'No summary available';
  
  let text = `Workflow "${workflow.name}" has completed successfully.\n\n`;
  text += `Summary: ${summary}\n\n`;
  
  // Add insights if available
  if (insights.length > 0) {
    text += 'Insights:\n';
    insights.forEach((insight, index) => {
      text += `${index + 1}. ${insight}\n`;
    });
    text += '\n';
  }
  
  // Add technical details
  text += `Workflow ID: ${workflow.id}\n`;
  text += `Completed at: ${new Date().toISOString()}\n`;
  text += `Platform: ${workflow.platform || 'Not specified'}\n`;
  
  return text;
}

/**
 * Generate HTML email content for a completed workflow
 * @param {object} workflow The workflow object
 * @returns {string} Formatted HTML email content
 */
function generateWorkflowSummaryHtml(workflow) {
  const context = workflow.context || {};
  const insights = context.insights || [];
  const summary = context.summary || 'No summary available';
  
  let insightsList = '';
  if (insights.length > 0) {
    insightsList = insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('');
  } else {
    insightsList = '<li>No insights available</li>';
  }
  
  // Create HTML email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4CAF50;">Workflow Completed: ${workflow.name}</h2>
      <p>Your workflow has completed successfully.</p>
      
      <h3 style="margin-top: 20px; color: #555;">Summary</h3>
      <p style="background-color: #f9f9f9; padding: 10px; border-radius: 4px;">${summary}</p>
      
      <h3 style="margin-top: 20px; color: #555;">Insights</h3>
      <ul style="padding-left: 20px;">
        ${insightsList}
      </ul>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #757575;">
        <p>
          Workflow ID: ${workflow.id}<br>
          Completed at: ${new Date().toISOString()}<br>
          Platform: ${workflow.platform || 'Not specified'}
        </p>
      </div>
    </div>
  `;
  
  return html;
}

/**
 * Generate plain text email content for a failed workflow
 * @param {object} workflow The workflow object
 * @returns {string} Formatted plain text email content
 */
function generateWorkflowFailureText(workflow) {
  const errorMessage = workflow.lastError || 'Unknown error occurred';
  
  let text = `Workflow "${workflow.name}" has failed.\n\n`;
  text += `Error: ${errorMessage}\n\n`;
  
  // Add technical details
  text += `Workflow ID: ${workflow.id}\n`;
  text += `Failed at: ${new Date().toISOString()}\n`;
  text += `Platform: ${workflow.platform || 'Not specified'}\n`;
  text += `Current step: ${workflow.currentStep || 0}\n`;
  
  return text;
}

/**
 * Generate HTML email content for a failed workflow
 * @param {object} workflow The workflow object
 * @returns {string} Formatted HTML email content
 */
function generateWorkflowFailureHtml(workflow) {
  const errorMessage = workflow.lastError || 'Unknown error occurred';
  
  // Create HTML email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #F44336;">Workflow Failed: ${workflow.name}</h2>
      <p>Unfortunately, your workflow has failed.</p>
      
      <h3 style="margin-top: 20px; color: #555;">Error Details</h3>
      <p style="background-color: #FFEBEE; padding: 10px; border-radius: 4px; color: #B71C1C;">${errorMessage}</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #757575;">
        <p>
          Workflow ID: ${workflow.id}<br>
          Failed at: ${new Date().toISOString()}<br>
          Platform: ${workflow.platform || 'Not specified'}<br>
          Current step: ${workflow.currentStep || 0}
        </p>
      </div>
    </div>
  `;
  
  return html;
}