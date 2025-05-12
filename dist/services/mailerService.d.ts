/**
 * Mailer Service
 * Handles email sending functionality using SendGrid
 */
import { type EmailLog } from '../shared/schema.js';
export interface EmailContent {
    subject: string;
    text?: string;
    html?: string;
}
export interface EmailRecipient {
    email: string;
    name?: string;
}
export interface EmailSendOptions {
    from: EmailRecipient;
    to: EmailRecipient | EmailRecipient[];
    cc?: EmailRecipient | EmailRecipient[];
    bcc?: EmailRecipient | EmailRecipient[];
    content: EmailContent;
    attachments?: any[];
    workflowId?: string | null;
}
/**
 * Initialize the mailer service with API key
 */
export declare function initializeMailer(apiKey?: string): void;
/**
 * Send an email using the configured email service
 */
export declare function sendEmail(options: EmailSendOptions): Promise<EmailLog>;
/**
 * Get email logs for a specific workflow
 */
export declare function getEmailLogsByWorkflowId(workflowId: string): Promise<EmailLog[]>;
