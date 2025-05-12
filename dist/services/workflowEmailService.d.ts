/**
 * Workflow Email Service
 * Handles sending emails for workflow events like completion, failure, etc.
 */
import { Workflow } from '../shared/schema.js';
interface WorkflowEmailOptions {
    workflow: Workflow;
    recipients: string | string[];
    subject?: string;
    includeInsights?: boolean;
    fromName?: string;
    fromEmail?: string;
}
/**
 * Send a workflow summary email
 */
export declare function sendWorkflowSummaryEmail(options: WorkflowEmailOptions): Promise<boolean>;
/**
 * Send an email when a workflow completes
 * This is a convenience function for the common use case
 */
export declare function sendWorkflowCompletionEmail(workflowId: string, recipients: string | string[]): Promise<boolean>;
export {};
