/**
 * Workflow Email Service
 *
 * This module provides functionality for sending email notifications related to workflows.
 * It includes features for:
 * - Configuring email notifications for workflows
 * - Sending completion and failure notifications
 * - Managing email logs
 * - Retrying failed emails
 * 
 * The service uses a database for persistence and supports multiple email delivery methods.
 */

import { db } from '../shared/db.js';
import { emails, emailLogs, emailNotifications } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { generateWorkflowSummaryHtml } from './emailTemplates.js';
import logger from '../utils/logger.js';
import { sendEmail } from './mailerService.js';
import { getErrorMessage } from '../utils/errorUtils.js';

/**
 * Configuration options for email notifications
 */
export interface EmailNotificationConfig {
  /** Email address to receive notifications */
  recipientEmail: string;
  /** Whether to send notifications on workflow completion */
  sendOnCompletion?: boolean;
  /** Whether to send notifications on workflow failure */
  sendOnFailure?: boolean;
}

/**
 * Result of an email sending operation
 */
export interface EmailResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Message describing the result */
  message?: string;
  /** ID of the sent email (if successful) */
  emailId?: string;
  /** Error message (if unsuccessful) */
  error?: string;
}

/**
 * Email notification database record
 */
interface EmailNotification {
  id: string;
  workflowId: string;
  recipientEmail: string;
  sendOnCompletion: boolean;
  sendOnFailure: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email log database record
 */
interface EmailLog {
  id: string;
  workflowId: string;
  recipientEmail: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  sentAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Initialize nodemailer transporter with environment variables or defaults
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Create transporter lazily to avoid connection issues at module load time
let transporter: ReturnType<typeof createTransporter> | null = null;

/**
 * Get the email transporter, creating it if necessary
 */
function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}
/**
 * Configure email notifications for a workflow
 *
 * @param workflowId - The ID of the workflow
 * @param config - Configuration options for notifications
 * @returns Promise resolving to the operation result
 */
export async function configureNotification(
  workflowId: string,
  config: EmailNotificationConfig
): Promise<{ success: boolean; notification?: EmailNotification; message: string; error?: string }> {
  try {
    // Validate inputs
    if (!workflowId) {
      throw new Error('Workflow ID is required');
    }
   
    if (!config.recipientEmail) {
      throw new Error('Recipient email is required');
    }

    // Insert or update notification settings
    const result = await db
      .insert(emailNotifications)
      .values({
        workflowId,
        recipientEmail: config.recipientEmail,
        sendOnCompletion: config.sendOnCompletion ?? true,
        sendOnFailure: config.sendOnFailure ?? true,
      })
      .onConflictDoUpdate({
        target: emailNotifications.workflowId!,
        set: {
          recipientEmail: config.recipientEmail,
          sendOnCompletion: config.sendOnCompletion ?? true,
          sendOnFailure: config.sendOnFailure ?? true,
          updatedAt: new Date(),
        },
      })
      .returning();
   
    const notification = result[0];

    logger.info({
      event: 'email_notification_configured',
      workflowId,
      recipientEmail: config.recipientEmail,
    });

    return {
      success: true,
      notification,
      message: 'Email notification configured successfully',
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'email_notification_config_error',
        workflowId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to configure email notification'
    );

    return {
      success: false,
      message: 'Failed to configure email notification',
      error: errorMessage,
    };
  }
}
/**
 * Get notification settings for a workflow
 *
 * @param workflowId - The ID of the workflow
 * @returns Promise resolving to notification settings or null if not found
 */
export async function getNotificationSettings(
  workflowId: string
): Promise<EmailNotification | null> {
  try {
    const [settings] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId!, workflowId));
    
    return settings || null;
  } catch (error) {
    logger.error(
      {
        event: 'get_notification_settings_error',
        workflowId,
        error: getErrorMessage(error),
      },
      'Failed to get notification settings'
    );
    
    throw new Error(`Failed to get notification settings: ${getErrorMessage(error)}`);
  }
}
/**
 * Delete notification settings for a workflow
 *
 * @param workflowId - The ID of the workflow
 * @returns Promise resolving to the operation result
 */
export async function deleteNotification(
  workflowId: string
): Promise<{ success: boolean; deleted: boolean }> {
  try {
    const result = await db
      .delete(emailNotifications)
      .where(eq(emailNotifications.workflowId!, workflowId))
      .returning();

    logger.info({
      event: 'email_notification_deleted',
      workflowId,
      deleted: result.length > 0,
    });

    return {
      success: true,
      deleted: result.length > 0
    };
  } catch (error) {
    logger.error(
      {
        event: 'delete_notification_error',
        workflowId,
        error: getErrorMessage(error),
      },
      'Failed to delete notification settings'
    );
    
    throw new Error(`Failed to delete notification settings: ${getErrorMessage(error)}`);
  }
}
/**
 * Get email logs for a workflow
 *
 * @param workflowId - The ID of the workflow
 * @returns Promise resolving to an array of email logs
 */
export async function getEmailLogs(workflowId: string): Promise<EmailLog[]> {
  try {
    return db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.workflowId!, workflowId))
      .orderBy(emailLogs.createdAt);
  } catch (error) {
    logger.error(
      {
        event: 'get_email_logs_error',
        workflowId,
        error: getErrorMessage(error),
      },
      'Failed to get email logs'
    );
    
    throw new Error(`Failed to get email logs: ${getErrorMessage(error)}`);
  }
}
/**
 * Retry sending a failed email
 *
 * @param emailLogId - The ID of the email log
 * @returns Promise resolving to the operation result
 */
export async function retryEmail(emailLogId: string): Promise<EmailResult> {
  try {
    // Get the email log
    const [log] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, emailLogId));
   
    if (!log) {
      return {
        success: false,
        message: 'Email log not found',
        error: 'Email log not found',
      };
    }

    // Check if the email is in a failed state
    if (log.status !== 'failed') {
      return {
        success: false,
        message: `Email is not in failed state (current: ${log.status})`,
        error: `Email is not in failed state (current: ${log.status})`,
      };
    }

    // Retry sending the email
    return sendWorkflowEmail(log.workflowId!, log.recipientEmail);
  } catch (error) {
    logger.error(
      {
        event: 'retry_email_error',
        emailLogId,
        error: getErrorMessage(error),
      },
      'Failed to retry email'
    );

    return {
      success: false,
      message: 'Failed to retry email',
      error: getErrorMessage(error),
    };
  }
}
/**
 * Send an email for a workflow
 *
 * @param workflowId - The ID of the workflow
 * @param recipientEmail - The recipient's email address
 * @returns Promise resolving to the operation result
 */
export async function sendWorkflowEmail(
  workflowId: string,
  recipientEmail: string
): Promise<EmailResult> {
  try {
    // Validate inputs
    if (!workflowId) {
      throw new Error('Workflow ID is required');
    }
   
    if (!recipientEmail) {
      throw new Error('Recipient email is required');
    }

    // Get workflow details
    const [workflow] = await db
      .select()
      .from(emails)
      .where(eq(emails.workflowId!, workflowId));

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Add required workflowStatus field for the template
    const templateData = {
      ...workflow,
      workflowId: workflowId,
      workflowStatus: 'completed',
    };

    // Generate email content
    const emailContent = generateWorkflowSummaryHtml(templateData);

    // Get the transporter
    const transporter = getTransporter();

    // Send the email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'workflow@example.com',
      to: recipientEmail,
      subject: `Workflow ${workflowId} Update`,
      html: emailContent,
    });

    // Log the successful email
    const [log] = await db
      .insert(emailLogs)
      .values({
        workflowId,
        recipientEmail,
        subject: `Workflow ${workflowId} Update`,
        status: 'sent',
        attempts: 1,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info({
      event: 'workflow_email_sent',
      workflowId,
      recipientEmail,
      messageId: info.messageId,
    });

    return {
      success: true,
      message: 'Email sent successfully',
      emailId: log.id,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    
    logger.error(
      {
        event: 'send_workflow_email_error',
        workflowId,
        recipientEmail,
        error: errorMessage,
      },
      'Failed to send workflow email'
    );

    // Log the failed attempt
    try {
      const [log] = await db
        .insert(emailLogs)
        .values({
          workflowId,
          recipientEmail,
          subject: `Workflow ${workflowId} Update`,
          status: 'failed',
          attempts: 1,
          errorMessage: errorMessage,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      return {
        success: false,
        message: 'Failed to send email',
        error: errorMessage,
        emailId: log.id,
      };
    } catch (logError) {
      // If we can't even log the failure, just return the error
      return {
        success: false,
        message: 'Failed to send email and log the failure',
        error: errorMessage,
      };
    }
  }
}
export async function sendCompletionEmail(workflowId: string, results: any): Promise<void> {
  try {
    const [config] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId!, workflowId));
    if (!config || !config.sendOnCompletion) {
      return;
    }
    const emailContent = {
      subject: 'Workflow Completed Successfully',
      text: generateCompletionEmailText(results),
      html: generateCompletionEmailHtml(results),
    };
    await sendEmail({
      from: {
        email: process.env.DEFAULT_SENDER_EMAIL || 'noreply@example.com',
        name: 'System Notification',
      },
      to: { email: config.recipientEmail },
      content: emailContent,
    });
    logger.info({
      event: 'completion_email_sent',
      workflowId,
      recipientEmail: config.recipientEmail,
    });
  } catch (error) {
    logger.error(
      {
        event: 'completion_email_error',
        workflowId,
        ...formatError(error),
      },
      'Failed to send workflow completion email'
    );
    throw error;
  }
}
export async function sendFailureEmail(workflowId: string, error: unknown): Promise<void> {
  try {
    const [config] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId!, workflowId));
    if (!config || !config.sendOnFailure) {
      return;
    }
    const errorMessage = getErrorMessage(error);
    const emailContent = {
      subject: 'Workflow Failed',
      text: generateFailureEmailText(errorMessage),
      html: generateFailureEmailHtml(errorMessage),
    };
    await sendEmail({
      from: {
        email: process.env.DEFAULT_SENDER_EMAIL || 'noreply@example.com',
        name: 'System Notification',
      },
      to: { email: config.recipientEmail },
      content: emailContent,
    });
    logger.info({
      event: 'failure_email_sent',
      workflowId,
      recipientEmail: config.recipientEmail,
    });
  } catch (emailError) {
    logger.error(
      {
        event: 'failure_email_error',
        workflowId,
        originalError: getErrorMessage(error),
        ...formatError(emailError),
      },
      'Failed to send workflow failure email'
    );
    throw emailError;
  }
}
function generateCompletionEmailText(results: any): string {
  return `
Your workflow has completed successfully.
Results:
${JSON.stringify(results, null, 2)}
This is an automated message. Please do not reply.
`;
}
function generateCompletionEmailHtml(results: any): string {
  return `
<html>
  <body>
    <h2>Workflow Completed Successfully</h2>
    <p>Your workflow has completed successfully.</p>
    <h3>Results:</h3>
    <pre>${JSON.stringify(results, null, 2)}</pre>
    <hr>
    <p><em>This is an automated message. Please do not reply.</em></p>
  </body>
</html>
`;
}
function generateFailureEmailText(errorMessage: string): string {
  return `
Your workflow has failed with the following error:
${errorMessage}
Please check the workflow logs for more details.
This is an automated message. Please do not reply.
`;
}
function generateFailureEmailHtml(errorMessage: string): string {
  return `
<html>
  <body>
    <h2>Workflow Failed</h2>
    <p>Your workflow has failed with the following error:</p>
    <pre style="color: red;">${errorMessage}</pre>
    <p>Please check the workflow logs for more details.</p>
    <hr>
    <p><em>This is an automated message. Please do not reply.</em></p>
  </body>
</html>
`;
}
