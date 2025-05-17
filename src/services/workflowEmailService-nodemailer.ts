/**
 * Workflow Email Service
 * Handles sending email notifications for workflow events
 * This version uses nodemailer for testing purposes
 */
import nodemailer from 'nodemailer';
import { workflows, emailNotifications, Workflow } from '....js';
import { db } from '../shared/db.js';
import { generateWorkflowSummaryHtml } from './emailTemplates.js';
import { eq } from 'drizzle-orm';
// Keep track of the NodeMailer test account
let testAccount: any = null;
let transporter: any = null;
/**
 * Initialize the email service
 */
export async function initializeEmailService(): Promise<boolean> {
  try {
    // Create a test account if not already created
    if (!testAccount) {
      testAccount = await nodemailer.createTestAccount();
      console.log('Created NodeMailer test account:', testAccount.user);
      // Create reusable transporter
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    return false;
  }
}
/**
 * Send an email notification for a workflow
 * Includes details about the workflow status and results
 */
export async function sendWorkflowSummaryEmail(
  workflowId: string,
  recipientEmail: string = 'test@example.com'
): Promise<boolean> {
  try {
    // Make sure we're initialized
    if (!testAccount || !transporter) {
      await initializeEmailService();
    }
    // Get the workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId.toString()));
    if (!workflow) {
      console.error(`Cannot send email for workflow ${workflowId}: Workflow not found`);
      return false;
    }
    // Only send emails for completed workflows
    if (workflow.status !== 'completed') {
      console.log(`Not sending email for workflow ${workflowId} - status is ${workflow.status}`);
      return false;
    }
    // Generate email content using type casting to satisfy TemplateData requirements
    const templateData = {
      workflowId: workflow.id,
      workflowStatus: workflow.status,
      createdAt: workflow.createdAt,
      completedAt: workflow.updatedAt,
      // Include other properties from the workflow as needed
      summary:
        typeof workflow.context === 'object' && workflow.context
          ? JSON.stringify(workflow.context).substring(0, 200) + '...'
          : 'Workflow completed',
    };
    const { subject, html } = {
      subject: `Workflow Summary: ${workflow.id} (${workflow.status})`,
      html: generateWorkflowSummaryHtml(templateData),
    };
    const text = `Workflow ${workflow.id} is ${workflow.status}. Created: ${workflow.createdAt}`;
    // Send the email
    const info = await transporter.sendMail({
      from: testAccount.user,
      to: recipientEmail,
      subject,
      text,
      html,
    });
    console.log(`Workflow summary email sent to ${recipientEmail}. ID: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    // Update the workflow
    await // @ts-ignore
    db
      .update(workflows)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId.toString()));
    return true;
  } catch (error) {
    console.error('Error sending workflow summary email:', error);
    return false;
  }
}
/**
 * Send email notifications to all configured recipients for a workflow
 */
export async function sendWorkflowNotifications(workflowId: string): Promise<boolean> {
  try {
    // Get the workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId.toString()));
    if (!workflow) {
      console.error(`Cannot send notifications for workflow ${workflowId}: Workflow not found`);
      return false;
    }
    // Get notification settings
    const notifications = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId!, workflowId));
    if (!notifications || notifications.length === 0) {
      console.log(`No notifications configured for workflow ${workflowId}`);
      return false;
    }
    // Send emails to all recipients
    let success = true;
    for (const notification of notifications) {
      // Only send if appropriate for workflow status
      if (
        (workflow.status === 'completed' && notification.sendOnCompletion) ||
        (workflow.status === 'failed' && notification.sendOnFailure)
      ) {
        const result = await sendWorkflowSummaryEmail(workflowId, notification.recipientEmail);
        if (!result) success = false;
      }
    }
    return success;
  } catch (error) {
    console.error('Error sending workflow notifications:', error);
    return false;
  }
}
