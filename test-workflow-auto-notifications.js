/**
 * Test script for Workflow Automated Email Notifications
 * 
 * This script tests the complete integration between workflows and email notifications
 * by creating a workflow, configuring notification settings, and verifying emails are sent
 * automatically when the workflow completes.
 * 
 * Usage: node test-workflow-auto-notifications.js <recipient-email>
 * Example: node test-workflow-auto-notifications.js user@example.com
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { v4 as uuidv4 } from 'uuid';
import { workflows, emailNotifications } from './dist/shared/schema.js';
import { initializeMailer } from './dist/services/fixed-mailerService.js';
import { configureEmailNotifications, processWorkflowStatusNotifications } from './dist/services/fixed-workflowEmailService.js';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Test automated workflow email notifications
 */
async function testAutomatedWorkflowNotifications() {
  try {
    console.log('Testing Automated Workflow Email Notifications...');
    
    // Get recipient email from command line
    const recipientEmail = process.argv[2];
    if (!recipientEmail) {
      console.error('Error: Recipient email is required');
      console.error('Usage: node test-workflow-auto-notifications.js <recipient-email>');
      process.exit(1);
    }
    
    // Initialize mailer with SendGrid API key
    initializeMailer(process.env.SENDGRID_API_KEY);
    console.log('Mailer service initialized');
    
    // Step 1: Create a test workflow
    console.log('Step 1: Creating test workflow...');
    const workflowId = uuidv4();
    const [workflow] = await db.insert(workflows).values({
      id: workflowId,
      name: 'Auto Notification Test',
      type: 'test',
      platform: 'demo',
      steps: [
        { 
          id: 'step1', 
          name: 'Test Step 1', 
          type: 'processData', 
          config: { operation: 'test' } 
        }
      ],
      status: 'pending',
      currentStep: 0,
      context: {
        startedBy: 'test-auto-notifications',
        timestamp: new Date().toISOString(),
        insights: [
          'Sample insight 1 from automated test',
          'Sample insight 2 from automated test',
          'Sample insight 3 from automated test'
        ],
        summary: 'This is a test workflow for automated email notifications'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date()
    }).returning();
    console.log(`Created test workflow with ID: ${workflowId}`);
    
    // Step 2: Configure email notification settings for this workflow
    console.log('Step 2: Configuring email notification settings...');
    const notificationSettings = await configureEmailNotifications({
      workflowId: workflowId,
      recipientEmail: recipientEmail,
      sendOnCompletion: true,
      sendOnFailure: true
    });
    console.log('Email notification settings configured:', notificationSettings.id);
    
    // Step 3: Mark workflow as completed
    console.log('Step 3: Marking workflow as completed...');
    const [updatedWorkflow] = await db
      .update(workflows)
      .set({
        status: 'completed',
        currentStep: 1,
        lastUpdated: new Date()
      })
      .where(eq(workflows.id, workflowId))
      .returning();
    console.log(`Workflow status updated to: ${updatedWorkflow.status}`);
    
    // Step 4: Trigger email notification processing
    console.log('Step 4: Triggering automated email notification processing...');
    const notificationResult = await processWorkflowStatusNotifications(workflowId);
    console.log('Notification processing result:', notificationResult);
    
    if (notificationResult.sent > 0) {
      console.log(`✓ Success: ${notificationResult.sent} email(s) sent to ${recipientEmail}`);
    } else {
      console.error(`✗ Error: No emails were sent. Result: ${notificationResult.message}`);
    }
    
    // Clean up after 30 seconds to allow email to be delivered and checked
    console.log('Cleaning up test data in 30 seconds...');
    setTimeout(async () => {
      try {
        // Delete test workflow
        await db.delete(workflows).where(eq(workflows.id, workflowId));
        console.log(`Test workflow ${workflowId} deleted`);
        
        // Delete notification settings
        await db.delete(emailNotifications).where(eq(emailNotifications.id, notificationSettings.id));
        console.log(`Notification settings ${notificationSettings.id} deleted`);
        
        console.log('Test cleanup completed');
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      } finally {
        process.exit(0);
      }
    }, 30000);
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAutomatedWorkflowNotifications();