import { db } from '../shared/db.js.js';
import { isError } from '../utils/errorUtils.js.js';
import { emails, emailLogs, emailNotifications } from '../shared/schema.js.js';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { generateWorkflowSummaryHtml } from './emailTemplates.js.js';
import logger from '../utils/logger.js.js';
import { formatError } from '../utils/logger.js.js';
import { sendEmail } from './mailerService.js.js';
import { getErrorMessage } from '../utils/errorUtils.js.js';
interface EmailNotificationConfig {
  recipientEmail: string;
  sendOnCompletion?: boolean;
  sendOnFailure?: boolean;
}
interface EmailResult {
  success: boolean;
  message?: string;
  emailId?: string;
}
// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
export async function configureNotification(workflowId: string, config: EmailNotificationConfig) {
  try {
    await db
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
        },
      });
    logger.info({
      event: 'email_notification_configured',
      workflowId,
      recipientEmail: config.recipientEmail,
    });
  } catch (error) {
    logger.error({
      event: 'email_notification_config_error',
      workflowId,
      ...formatError(error)
    }, 'Failed to configure email notification');
    throw error;
  }
}
export async function getNotificationSettings(workflowId: string) {
  const [settings] = await db.select()
    .from(emailNotifications)
    .where(eq(emailNotifications.workflowId!, workflowId));
  return settings;
}
export async function deleteNotification(workflowId: string) {
  const result = await db.delete(emailNotifications)
    .where(eq(emailNotifications.workflowId!, workflowId))
    .returning();
  return { success: true, deleted: result.length > 0 };
}
export async function getEmailLogs(workflowId: string) {
  return db.select()
    .from(emailLogs)
    .where(eq(emailLogs.workflowId!, workflowId))
    .orderBy(emailLogs.createdAt);
}
export async function retryEmail(emailLogId: string): Promise<EmailResult> {
  const [log] = await db.select()
    .from(emailLogs)
    .where(eq(emailLogs.id, emailLogId.toString()));
  if (!log) {
    throw new Error('Email log not found');
  }
  return sendWorkflowEmail(log.workflowId!, log.recipientEmail);
}
export async function sendWorkflowEmail(workflowId: string, recipientEmail: string): Promise<EmailResult> {
  try {
    const [workflow] = await db.select()
      .from(emails)
      .where(eq(emails.workflowId!, workflowId));
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    // Add required workflowStatus field for the template
    const templateData = {
      ...workflow,
      workflowId: workflowId,
      workflowStatus: 'completed'
    };
    const emailContent = generateWorkflowSummaryHtml(templateData);
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
        attempts: 1,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return {
      success: true,
      message: 'Email sent successfully',
      emailId: log.id
    };
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    console.error('Error sending email:', error);
    return {
      success: false,
      message: error instanceof Error ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error) : 'Failed to send email'
    };
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
      from: { email: process.env.DEFAULT_SENDER_EMAIL || "noreply@example.com", name: "System Notification" },
      to: { email: config.recipientEmail },
      content: emailContent,
    });
    logger.info({
      event: 'completion_email_sent',
      workflowId,
      recipientEmail: config.recipientEmail,
    });
  } catch (error) {
    logger.error({
      event: 'completion_email_error',
      workflowId,
      ...formatError(error)
    }, 'Failed to send workflow completion email');
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
      from: { email: process.env.DEFAULT_SENDER_EMAIL || "noreply@example.com", name: "System Notification" },
      to: { email: config.recipientEmail },
      content: emailContent,
    });
    logger.info({
      event: 'failure_email_sent',
      workflowId,
      recipientEmail: config.recipientEmail,
    });
  } catch (emailError) {
    logger.error({
      event: 'failure_email_error',
      workflowId,
      originalError: getErrorMessage(error),
      ...formatError(emailError)
    }, 'Failed to send workflow failure email');
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