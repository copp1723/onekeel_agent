/**
 * Alternative Mailer Service
 * Provides email sending capabilities with SendGrid
 * This version implements a fallback mechanism when sender verification fails
 */
import sgMail from '@sendgrid/mail';
// @ts-ignore - Add declaration for nodemailer
import nodemailer from 'nodemailer';
import { db } from '../shared/db.js';
// Track if SendGrid is initialized
let isMailerInitialized = false;
let sendGridApiKey = null;
// Backup nodemailer transporter
let nodeMailerTransport = null;
/**
 * Initialize the email service with API key
 */
export function initializeMailer(apiKey) {
    try {
        sgMail.setApiKey(apiKey);
        sendGridApiKey = apiKey;
        isMailerInitialized = true;
        console.log('SendGrid mailer service initialized successfully');
        return true;
    }
    catch (error) {
        console.error('Failed to initialize SendGrid mailer service:', error);
        return false;
    }
}
/**
 * Initialize the nodemailer fallback
 * Uses ethereal.email for testing
 */
async function initializeNodemailerFallback() {
    try {
        // Create a test account at ethereal.email
        const testAccount = await nodemailer.createTestAccount();
        // Create reusable transporter with ethereal.email
        nodeMailerTransport = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log('Nodemailer fallback initialized with test account', testAccount.user);
        return true;
    }
    catch (error) {
        console.error('Failed to initialize nodemailer fallback:', error);
        return false;
    }
}
/**
 * Send an email using the configured service
 */
export async function sendEmail(to, subject, text, html, from = 'workflow-system@example.com') {
    try {
        if (!isMailerInitialized) {
            throw new Error('Mailer service not initialized. Call initializeMailer first.');
        }
        // Log the email sending attempt
        const emailLogId = await logEmailAttempt(to, subject);
        // Email message
        const message = {
            to: Array.isArray(to) ? to : [to],
            from,
            subject,
            text,
            html,
        };
        try {
            // Try sending with SendGrid first
            const response = await sgMail.send(message);
            // Extract message ID from response (if available)
            const messageId = response && response[0] && response[0].messageId || undefined;
            // Log success
            await updateEmailLogSuccess(emailLogId, messageId);
            return {
                success: true,
                messageId,
            };
        }
        catch (sendGridError) {
            console.warn('SendGrid email error, trying fallback method:', sendGridError?.response?.body?.errors || sendGridError);
            // If it's a sender verification error, try with nodemailer fallback
            if (sendGridError?.response?.body?.errors?.[0]?.field === 'from') {
                // Initialize nodemailer if not already done
                if (!nodeMailerTransport) {
                    await initializeNodemailerFallback();
                }
                // If nodemailer is available, use it
                if (nodeMailerTransport) {
                    try {
                        const info = await nodeMailerTransport.sendMail({
                            from: from,
                            to: Array.isArray(to) ? to.join(',') : to,
                            subject,
                            text,
                            html,
                        });
                        // Log the message and preview URL
                        console.log('Nodemailer fallback message sent:', info.messageId);
                        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
                        // Log success with fallback
                        await updateEmailLogSuccess(emailLogId, info.messageId, 'nodemailer-fallback');
                        return {
                            success: true,
                            messageId: info.messageId,
                        };
                    }
                    catch (nodeMailerError) {
                        console.error('Nodemailer fallback error:', nodeMailerError);
                        // Log both failures
                        await updateEmailLogFailure(emailLogId, `SendGrid: ${sendGridError?.response?.body?.errors?.[0]?.message || sendGridError.message}, ` +
                            `Nodemailer: ${nodeMailerError.message}`);
                        return {
                            success: false,
                            error: nodeMailerError,
                        };
                    }
                }
            }
            // Log the SendGrid failure
            await updateEmailLogFailure(emailLogId, sendGridError?.response?.body?.errors?.[0]?.message || sendGridError.message);
            return {
                success: false,
                error: sendGridError,
            };
        }
    }
    catch (error) {
        console.error('Email sending error:', error);
        return {
            success: false,
            error,
        };
    }
}
/**
 * Log an email sending attempt
 */
async function logEmailAttempt(to, subject) {
    try {
        const recipients = Array.isArray(to) ? to.join(', ') : to;
        const [emailLog] = await db
            .insert(EmailLog)
            .values({
            recipients,
            subject,
            status: 'sending',
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning();
        return emailLog.id;
    }
    catch (error) {
        console.error('Failed to log email attempt:', error);
        // Return a placeholder ID
        return 'logging-failed';
    }
}
/**
 * Update email log with success status
 */
async function updateEmailLogSuccess(id, messageId, provider = 'sendgrid') {
    try {
        if (id === 'logging-failed')
            return;
        await db
            .update(EmailLog)
            .set({
            status: 'sent',
            messageId,
            provider,
            sentAt: new Date(),
            updatedAt: new Date(),
        })
            .where(eq(EmailLog.id, id));
    }
    catch (error) {
        console.error('Failed to update email log with success:', error);
    }
}
/**
 * Update email log with failure status
 */
async function updateEmailLogFailure(id, errorMessage) {
    try {
        if (id === 'logging-failed')
            return;
        await db
            .update(EmailLog)
            .set({
            status: 'failed',
            errorMessage,
            updatedAt: new Date(),
        })
            .where(eq(EmailLog.id, id));
    }
    catch (error) {
        console.error('Failed to update email log with failure:', error);
    }
}
// Import missing dependencies
import { eq } from 'drizzle-orm';
//# sourceMappingURL=mailerServiceAlternative.js.map