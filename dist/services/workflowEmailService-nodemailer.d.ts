/**
 * Workflow Email Service
 * Handles sending email notifications for workflow events
 * This version uses nodemailer for testing purposes
 */
/**
 * Initialize the email service
 */
export declare function initializeEmailService(): Promise<boolean>;
/**
 * Send an email notification for a workflow
 * Includes details about the workflow status and results
 */
export declare function sendWorkflowSummaryEmail(workflowId: string, recipientEmail?: string): Promise<boolean>;
/**
 * Send email notifications to all configured recipients for a workflow
 */
export declare function sendWorkflowNotifications(workflowId: string): Promise<boolean>;
