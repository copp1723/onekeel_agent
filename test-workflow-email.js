/**
 * Test script for Workflow Email Notifications
 * This script demonstrates configuring and testing email notifications for workflows
 * 
 * Usage: node test-workflow-email.js <recipient-email>
 * Example: node test-workflow-email.js user@example.com
 */

import dotenv from 'dotenv';
import { db } from './src/shared/db.js';
import { 
  createWorkflow, 
  runWorkflow, 
  configureWorkflowNotifications 
} from './src/services/workflowService.js';
import { initializeMailer } from './src/services/mailerService.js';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Recipient email should be provided as command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('Please provide a recipient email address as an argument');
  console.error('Usage: node test-workflow-email.js <recipient-email>');
  process.exit(1);
}

if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY environment variable is not set');
  console.error('Email delivery will not work without a valid SendGrid API key');
  process.exit(1);
}

/**
 * Test workflow email notifications
 */
async function testWorkflowEmail() {
  console.log('Testing Workflow Email Notifications...');
  
  try {
    // Initialize the mailer service with the API key
    initializeMailer(process.env.SENDGRID_API_KEY);
    
    // Step 1: Create a test workflow with sample steps
    const testSteps = [
      {
        id: '1',
        name: 'Test Step 1',
        type: 'processData',
        config: { operation: 'transform', data: { sample: 'data' } }
      },
      {
        id: '2',
        name: 'Test Step 2',
        type: 'fetchEmails',
        config: { platform: 'VinSolutions', searchCriteria: { subject: 'Test' } }
      },
      {
        id: '3',
        name: 'Test Step 3',
        type: 'generateInsights',
        config: { platform: 'VinSolutions' }
      }
    ];
    
    // Initial context with test data
    const initialContext = {
      startedBy: 'email-test-script',
      timestamp: new Date().toISOString(),
      testData: {
        results: [
          { name: 'Test Item 1', value: 123 },
          { name: 'Test Item 2', value: 456 }
        ],
        summary: 'This is a test workflow for email notifications'
      }
    };
    
    console.log('Creating test workflow...');
    const workflow = await createWorkflow(testSteps, initialContext);
    console.log(`Created workflow: ${workflow.id}`);
    
    // Step 2: Configure email notifications for this workflow
    console.log(`Configuring email notifications for ${recipientEmail}...`);
    await configureWorkflowNotifications(workflow.id, recipientEmail);
    console.log('Email notifications configured successfully');
    
    // Step 3: Run the workflow - this should trigger email when completed
    console.log('Running workflow...');
    
    // Run first step
    console.log('Running step 1...');
    const step1Result = await runWorkflow(workflow.id);
    console.log(`After step 1: Status = ${step1Result.status}, Step = ${step1Result.currentStep}`);
    
    // Run second step
    console.log('Running step 2...');
    const step2Result = await runWorkflow(workflow.id);
    console.log(`After step 2: Status = ${step2Result.status}, Step = ${step2Result.currentStep}`);
    
    // Run third step (final)
    console.log('Running step 3 (final)...');
    const finalResult = await runWorkflow(workflow.id);
    console.log(`After step 3: Status = ${finalResult.status}, Step = ${finalResult.currentStep}`);
    
    // Wait for 2 seconds to allow email sending to complete
    console.log('Workflow completed. Waiting for email to be sent...');
    await setTimeout(2000);
    
    console.log(`Test completed. Check your email (${recipientEmail}) for the workflow summary.`);
    
  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run the test
testWorkflowEmail()
  .then(() => {
    console.log('Workflow email test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });