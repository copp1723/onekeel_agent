/**
 * Alternative Mailer Service
 * Provides email sending capabilities with SendGrid
 * This version implements a fallback mechanism when sender verification fails
 */
/**
 * Initialize the email service with API key
 */
export declare function initializeMailer(apiKey: string): boolean;
/**
 * Send an email using the configured service
 */
export declare function sendEmail(to: string | string[], subject: string, text: string, html: string, from?: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: any;
}>;
