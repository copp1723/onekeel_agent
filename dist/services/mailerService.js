/**
 * Mailer Service
 * Handles email sending functionality using SendGrid
 */
import { MailService } from '@sendgrid/mail';
import { db } from '../shared/db.js';
import { emailLogs } from '../shared/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
// Initialize SendGrid client
const mailService = new MailService();
/**
 * Initialize the mailer service with API key
 */
export function initializeMailer(apiKey) {
    try {
        mailService.setApiKey(apiKey);
        console.log('Mailer service initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize mailer service:', error);
        throw error;
    }
}
/**
 * Send an email using the configured email service
 */
export async function sendEmail(options) {
    const logId = uuidv4();
    let status = 'pending';
    let errorMessage;
    // Format recipients for log - convert to JSON array
    const recipients = Array.isArray(options.to)
        ? options.to.map(r => r.email)
        : [options.to.email];
    try {
        // Create a log entry for this email attempt
        const [logEntry] = await db.insert(emailLogs).values({
            id: logId,
            workflowId: options.workflowId,
            status: 'pending',
            recipients: recipients,
            subject: options.content.subject,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        // Prepare email for SendGrid - ensure required fields are present
        const message = {
            to: options.to,
            from: options.from,
            subject: options.content.subject,
            // Ensure at least one of text or html is provided
            ...(options.content.text ? { text: options.content.text } : {}),
            ...(options.content.html ? { html: options.content.html } : {}),
            // Include optional fields if present
            ...(options.cc ? { cc: options.cc } : {}),
            ...(options.bcc ? { bcc: options.bcc } : {}),
            ...(options.attachments ? { attachments: options.attachments } : {})
        };
        // If neither text nor html is provided, add a default text
        if (!options.content.text && !options.content.html) {
            message.text = " "; // Empty space as fallback
        }
        // Send the email
        await mailService.send(message);
        // Update log with success
        status = 'sent';
        await db
            .update(emailLogs)
            .set({
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date()
        })
            .where(eq(emailLogs.id, logId));
        console.log(`Email sent successfully. Log ID: ${logId}`);
        // Get the updated log entry
        const [updatedLog] = await db
            .select()
            .from(emailLogs)
            .where(eq(emailLogs.id, logId));
        return updatedLog;
    }
    catch (error) {
        // Handle error
        console.error('Failed to send email:', error);
        status = 'failed';
        errorMessage = error instanceof Error ? error.message : String(error);
        // Update log with failure
        await db
            .update(emailLogs)
            .set({
            status: 'failed',
            errorMessage,
            updatedAt: new Date()
        })
            .where(eq(emailLogs.id, logId));
        // Get the updated log entry
        const [updatedLog] = await db
            .select()
            .from(emailLogs)
            .where(eq(emailLogs.id, logId));
        return updatedLog;
    }
}
/**
 * Get email logs for a specific workflow
 */
export async function getEmailLogsByWorkflowId(workflowId) {
    try {
        const logs = await db
            .select()
            .from(emailLogs)
            .where(eq(emailLogs.workflowId, workflowId))
            .orderBy(emailLogs.createdAt);
        return logs;
    }
    catch (error) {
        console.error(`Failed to get email logs for workflow ${workflowId}:`, error);
        throw error;
    }
}
//# sourceMappingURL=mailerService.js.map