/**
 * Test script for the fixed workflow email notification system
 * 
 * This script tests sending workflow completion emails
 * using the fixed implementations of the email services
 * 
 * Usage: node test-fixed-workflow-email.js <recipient-email>
 */

import { db } from './dist/shared/db.js';
import { workflows } from './dist/shared/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { sendWorkflowCompletionEmail } from './dist/services/fixed-workflowEmailService.js';
import { initializeMailer } from './dist/services/fixed-mailerService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main test function
 */
async function testWorkflowEmails() {
  try {
    // Make sure we have a recipient email address
    const recipientEmail = process.argv[2];
    if (!recipientEmail) {
      console.error('Please provide a recipient email address as a command-line argument');
      console.log('Usage: node test-fixed-workflow-email.js <recipient-email>');
      process.exit(1);
    }
    
    // Initialize the mailer with SendGrid API key
    initializeMailer(process.env.SENDGRID_API_KEY);
    
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('No SENDGRID_API_KEY found in environment. Email functionality is disabled.');
      process.exit(1);
    }

    console.log(`Testing workflow email notifications with recipient: ${recipientEmail}`);
    
    // Create a test workflow
    const workflowId = uuidv4();
    const [workflow] = await db.insert(workflows).values({
      id: workflowId,
      name: 'Test Email Notification Workflow',
      steps: [
        { 
          id: 'step1', 
          name: 'Test Step 1', 
          type: 'processData', 
          config: { 
            operation: 'test' 
          } 
        }
      ],
      status: 'completed',
      currentStep: 1,
      context: {
        startedBy: 'test-script',
        timestamp: new Date().toISOString(),
        insights: [
          'This is a test insight 1',
          'This is a test insight 2'
        ],
        summary: 'This is a test summary of the workflow results'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date()
    }).returning();
    
    console.log(`Created test workflow with ID: ${workflowId}`);
    
    // Send a workflow completion email
    console.log('Sending workflow completion email...');
    const result = await sendWorkflowCompletionEmail(workflowId, recipientEmail);
    
    if (result.success) {
      console.log(`✅ Email sent successfully: ${result.message}`);
    } else {
      console.error(`❌ Failed to send email: ${result.error}`);
    }
    
    // Clean up the test workflow
    await db.delete(workflows).where('id', workflowId);
    console.log(`Cleaned up test workflow: ${workflowId}`);
    
    console.log('Test completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error in test:', error);
    process.exit(1);
  }
}

// Run the test
testWorkflowEmails();