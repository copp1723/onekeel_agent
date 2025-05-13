/**
 * Configure email notifications for a workflow
 * @param {object} params Configuration parameters
 * @param {string} params.workflowId ID of the workflow to configure notifications for
 * @param {string} params.recipientEmail Email address to send notifications to
 * @param {boolean} [params.sendOnCompletion=true] Send notifications on workflow completion
 * @param {boolean} [params.sendOnFailure=true] Send notifications on workflow failure
 * @returns {Promise<object>} The created notification settings
 */
export function configureEmailNotifications(params: {
    workflowId: string;
    recipientEmail: string;
    sendOnCompletion?: boolean | undefined;
    sendOnFailure?: boolean | undefined;
}): Promise<object>;
/**
 * Get email notification settings for a workflow
 * @param {string} workflowId ID of the workflow
 * @returns {Promise<object|null>} Notification settings or null if none exist
 */
export function getEmailNotificationSettings(workflowId: string): Promise<object | null>;
/**
 * Delete email notification settings for a workflow
 * @param {string} workflowId ID of the workflow
 * @returns {Promise<boolean>} True if settings were deleted, false if they didn't exist
 */
export function deleteEmailNotificationSettings(workflowId: string): Promise<boolean>;
/**
 * Get email logs for a workflow
 * @param {string} workflowId ID of the workflow
 * @returns {Promise<Array>} Array of email log entries
 */
export function getEmailLogs(workflowId: string): Promise<any[]>;
/**
 * Retry sending a failed email
 * @param {string} emailLogId ID of the failed email log entry
 * @returns {Promise<object>} Result of the retry attempt
 */
export function retryFailedEmail(emailLogId: string): Promise<object>;
/**
 * Send a workflow completion email
 * @param {string} workflowId ID of the completed workflow
 * @param {string} recipientEmail Email address to send to
 * @returns {Promise<object>} Result of the send operation
 */
export function sendWorkflowCompletionEmail(workflowId: string, recipientEmail: string): Promise<object>;
/**
 * Process email notifications for a workflow based on its status
 * This function is called automatically when workflow status changes
 *
 * @param {string} workflowId ID of the workflow
 * @returns {Promise<object>} Result of the notification processing
 */
export function processWorkflowStatusNotifications(workflowId: string): Promise<object>;
/**
 * Send a workflow failure email
 * @param {string} workflowId ID of the failed workflow
 * @param {string} recipientEmail Email address to send to
 * @returns {Promise<object>} Result of the send operation
 */
export function sendWorkflowFailureEmail(workflowId: string, recipientEmail: string): Promise<object>;
