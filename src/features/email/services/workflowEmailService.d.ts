/**
 * TypeScript type declarations for workflowEmailService.js
 */
/**
 * Email notification settings result
 */
export interface EmailNotification {
  id: string;
  workflowId: string;
  recipientEmail: string;
  sendOnCompletion: boolean;
  sendOnFailure: boolean;
  createdAt: Date;
  updatedAt: Date;
}
/**
 * Email log result
 */
export interface EmailLog {
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
/**
 * Response from sending a workflow completion email
 */
export interface EmailSendResult {
  success: boolean;
  message: string;
  emailId?: string;
  error?: string;
}
/**
 * Response from configuring email notifications
 */
export interface EmailNotificationConfigResult {
  success: boolean;
  notification?: EmailNotification;
  message: string;
  error?: string;
}
/**
 * Response from retrying a failed email
 */
export interface EmailRetryResult {
  success: boolean;
  message: string;
  emailLog?: EmailLog;
  error?: string;
}
/**
 * Send a workflow completion email
 * @param workflowId The ID of the completed workflow
 * @param recipientOverride Optional override for recipient email
 * @returns Result of the email sending operation
 */
export function sendWorkflowCompletionEmail(
  workflowId: string,
  recipientOverride?: string | string[]
): Promise<EmailSendResult>;
/**
 * Configure email notifications for a workflow
 * @param workflowId The ID of the workflow
 * @param recipientEmail The email address to receive notifications
 * @param options Additional options for notifications
 * @returns The notification configuration
 */
export function configureEmailNotifications(
  workflowId: string,
  recipientEmail: string,
  options?: {
    sendOnCompletion?: boolean;
    sendOnFailure?: boolean;
  }
): Promise<EmailNotificationConfigResult>;
/**
 * Get email notification settings for a workflow
 * @param workflowId The ID of the workflow
 * @returns The notification settings or null if not found
 */
export function getEmailNotificationSettings(workflowId: string): Promise<EmailNotification | null>;
/**
 * Delete email notification settings for a workflow
 * @param workflowId The ID of the workflow
 * @returns True if successful
 */
export function deleteEmailNotificationSettings(workflowId: string): Promise<boolean>;
/**
 * Get email logs for a workflow
 * @param workflowId The ID of the workflow
 * @returns Array of email logs
 */
export function getEmailLogs(workflowId: string): Promise<EmailLog[]>;
/**
 * Retry failed email for a workflow
 * @param emailLogId The ID of the email log
 * @returns Result of the retry operation
 */
export function retryFailedEmail(emailLogId: string): Promise<EmailRetryResult>;
