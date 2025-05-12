/**
 * Workflow Email Service
 * Handles sending email notifications for workflow events
 * This version uses nodemailer for testing purposes
 */

import nodemailer from 'nodemailer';
import { workflows } from '../shared/schema.js';
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
    const [workflow] = await db.select().from(Workflow).where(eq(Workflow.id, workflowId));
    
    if (!workflow) {
      console.error(`Cannot send email for workflow ${workflowId}: Workflow not found`);
      return false;
    }
    
    // Only send emails for completed workflows
    if (workflow.status !== 'completed') {
      console.log(`Not sending email for workflow ${workflowId} - status is ${workflow.status}`);
      return false;
    }
    
    // Generate email content
    const { subject, text, html } = generateWorkflowSummaryEmail(workflow);
    
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
    
    // Update the workflow with email notification status
    await db.update(Workflow)
      .set({
        notificationSent: true,
        notificationSentAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(Workflow.id, workflowId));
    
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
    const [workflow] = await db.select().from(Workflow).where(eq(Workflow.id, workflowId));
    
    if (!workflow) {
      console.error(`Cannot send notifications for workflow ${workflowId}: Workflow not found`);
      return false;
    }
    
    // Check if notifications are configured
    if (!workflow.notificationEmails || workflow.notificationEmails.length === 0) {
      console.log(`No notifications configured for workflow ${workflowId}`);
      return false;
    }
    
    // Parse the notification emails
    let emails: string[];
    try {
      emails = typeof workflow.notificationEmails === 'string' 
        ? [workflow.notificationEmails] 
        : workflow.notificationEmails;
    } catch (error) {
      console.error('Error parsing notification emails:', error);
      return false;
    }
    
    // Send emails to all recipients
    let success = true;
    for (const email of emails) {
      const result = await sendWorkflowSummaryEmail(workflowId, email);
      if (!result) success = false;
    }
    
    return success;
  } catch (error) {
    console.error('Error sending workflow notifications:', error);
    return false;
  }
}