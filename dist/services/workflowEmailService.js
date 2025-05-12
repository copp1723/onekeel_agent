/**
 * Workflow Email Service
 * Handles sending emails for workflow events like completion, failure, etc.
 */
import { workflows } from '../shared/schema.js';
import { db } from '../shared/db.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from './mailerService.js';
import { generateWorkflowSummaryHtml, generateWorkflowSummaryText } from './emailTemplates.js';
/**
 * Default email configuration
 */
const DEFAULT_EMAIL_CONFIG = {
    fromName: 'Workflow System',
    fromEmail: 'noreply@example.com',
    subject: 'Workflow Summary Report'
};
/**
 * Send a workflow summary email
 */
export async function sendWorkflowSummaryEmail(options) {
    try {
        const { workflow, recipients, includeInsights = true } = options;
        // Format recipients as array
        const recipientsList = Array.isArray(recipients) ? recipients : [recipients];
        // Extract email-friendly data from workflow
        const emailData = await extractWorkflowData(workflow, includeInsights);
        // Generate email content
        const html = generateWorkflowSummaryHtml(emailData);
        const text = generateWorkflowSummaryText(emailData);
        // Configure email
        const subject = options.subject || `${DEFAULT_EMAIL_CONFIG.subject}: ${workflow.status.toUpperCase()}`;
        const fromName = options.fromName || DEFAULT_EMAIL_CONFIG.fromName;
        const fromEmail = options.fromEmail || DEFAULT_EMAIL_CONFIG.fromEmail;
        // Prepare recipient format for SendGrid
        const formattedRecipients = recipientsList.map(email => ({
            email,
            name: email.split('@')[0] // Use part before @ as name for simple personalization
        }));
        // Send the email
        await sendEmail({
            from: { name: fromName, email: fromEmail },
            to: formattedRecipients,
            content: {
                subject,
                html,
                text
            },
            workflowId: workflow.id
        });
        console.log(`Workflow summary email sent for workflow ${workflow.id} to ${recipientsList.join(', ')}`);
        return true;
    }
    catch (error) {
        console.error('Failed to send workflow summary email:', error);
        return false;
    }
}
/**
 * Extract needed data from workflow for email template
 */
async function extractWorkflowData(workflow, includeInsights) {
    // Base data from workflow
    const data = {
        workflowId: workflow.id,
        workflowStatus: workflow.status,
        createdAt: workflow.createdAt,
        completedAt: workflow.lastUpdated,
    };
    // Extract context data if available
    if (workflow.context) {
        // Cast context to any to access dynamic properties
        const context = workflow.context;
        // Add summary if available
        if (context.summary) {
            data.summary = context.summary;
        }
        else if (context.__lastStepResult?.summary) {
            data.summary = context.__lastStepResult.summary;
        }
        // Add error if workflow failed
        if (workflow.status === 'failed' && workflow.lastError) {
            data.error = workflow.lastError;
        }
        // Extract insights if requested
        if (includeInsights) {
            // Try to find insights in context (common patterns)
            if (context.__lastStepResult?.insights) {
                data.insights = context.__lastStepResult.insights;
            }
            else if (context.insights) {
                data.insights = context.insights;
            }
            // If insights is not an array, convert to array
            if (data.insights && !Array.isArray(data.insights)) {
                data.insights = [data.insights];
            }
        }
    }
    return data;
}
/**
 * Send an email when a workflow completes
 * This is a convenience function for the common use case
 */
export async function sendWorkflowCompletionEmail(workflowId, recipients) {
    try {
        // Get the workflow from database
        const [workflow] = await db
            .select()
            .from(workflows)
            .where(eq(workflows.id, workflowId));
        if (!workflow) {
            console.error(`Cannot send completion email: Workflow ${workflowId} not found`);
            return false;
        }
        return await sendWorkflowSummaryEmail({
            workflow,
            recipients
        });
    }
    catch (error) {
        console.error(`Failed to send completion email for workflow ${workflowId}:`, error);
        return false;
    }
}
//# sourceMappingURL=workflowEmailService.js.map