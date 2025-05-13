/**
 * Initialize the mailer service with api key and options
 */
export function initializeMailer(apiKey: any, options?: {}): Promise<void>;
/**
 * Send an email
 * @param {object} params Email parameters
 * @param {string|object} params.to Recipient email or array of recipient objects
 * @param {string|object} [params.from] From email address or object
 * @param {object} params.content Email content with subject, text, html
 * @param {string} [params.workflowId] Optional workflow ID for logging
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, previewUrl?: string}>}
 */
export function sendEmail(params: {
    to: string | object;
    from?: string | object | undefined;
    content: object;
    workflowId?: string | undefined;
}): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    previewUrl?: string;
}>;
