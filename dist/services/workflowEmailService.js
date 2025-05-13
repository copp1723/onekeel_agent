import { db } from '../shared/db.js';
import { emails, emailLogs, emailNotifications } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { generateWorkflowSummaryHtml } from './emailTemplates.js';
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
export async function configureNotification(workflowId, config) {
    const [notification] = await // @ts-ignore
     db.insert(emailNotifications)
        .values({
        workflowId,
        recipientEmail: config.recipientEmail,
        sendOnCompletion: config.sendOnCompletion ?? true,
        sendOnFailure: config.sendOnFailure ?? true
    })
        .returning();
    return notification;
}
export async function getNotificationSettings(workflowId) {
    const [settings] = await db.select()
        .from(emailNotifications)
        .where(eq(emailNotifications.workflowId, workflowId));
    return settings;
}
export async function deleteNotification(workflowId) {
    const result = await // @ts-ignore
     db.delete(emailNotifications)
        .where(eq(emailNotifications.workflowId, workflowId))
        .returning();
    return { success: true, deleted: result.length > 0 };
}
export async function getEmailLogs(workflowId) {
    return db.select()
        .from(emailLogs)
        .where(eq(emailLogs.workflowId, workflowId))
        .orderBy(emailLogs.createdAt);
}
export async function retryEmail(emailLogId) {
    const [log] = await db.select()
        .from(emailLogs)
        .where(eq(emailLogs.id, emailLogId));
    if (!log) {
        throw new Error('Email log not found');
    }
    return sendWorkflowEmail(log.workflowId, log.recipientEmail);
}
export async function sendWorkflowEmail(workflowId, recipientEmail) {
    try {
        const [workflow] = await db.select()
            .from(emails)
            .where(eq(emails.workflowId, workflowId));
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
        const [log] = await // @ts-ignore
         db.insert(emailLogs)
            .values({
            workflowId,
            recipientEmail,
            status: 'sent',
            messageId: info.messageId
        })
            .returning();
        return {
            success: true,
            message: 'Email sent successfully',
            emailId: log.id
        };
    }
    catch (error) {
        console.error('Error sending email:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send email'
        };
    }
}
//# sourceMappingURL=workflowEmailService.js.map