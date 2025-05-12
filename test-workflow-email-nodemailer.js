/**
 * Test script for Workflow Email Notifications using Nodemailer
 * This version uses Ethereal for email testing
 * 
 * Usage: node test-workflow-email-nodemailer.js
 */

import dotenv from 'dotenv';
import { db } from './src/shared/db.js';
import {
  createWorkflow,
  runWorkflow,
  configureWorkflowNotifications
} from './src/services/workflowService.js';
import { 
  initializeEmailService, 
  sendWorkflowNotifications 
} from './src/services/workflowEmailService-nodemailer.js';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Test email address - can be any valid format, as emails go to Ethereal
const TEST_EMAIL = process.env.TEST_EMAIL_ADDRESS || 'workflow-test@example.com';

/**
 * Test workflow email notifications with Nodemailer
 */
async function testWorkflowEmailWithNodemailer() {
  console.log('Testing Workflow Email Notifications with Nodemailer...');
  
  try {
    // Initialize the email service
    await initializeEmailService();
    
    // Step 1: Create a test workflow with sample steps
    const testSteps = [
      {
        id: '1',
        name: 'Data Collection',
        type: 'processData',
        config: { operation: 'transform', data: { sample: 'data' } }
      },
      {
        id: '2',
        name: 'Analysis',
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
          { name: 'Sales Performance', value: 123 },
          { name: 'Customer Satisfaction', value: 4.8 },
          { name: 'Lead Conversion', value: '24%' }
        ],
        summary: 'This is a test workflow for email notifications'
      }
    };
    
    console.log('Creating test workflow...');
    const workflow = await createWorkflow(testSteps, initialContext);
    console.log(`Created workflow: ${workflow.id}`);
    
    // Step 2: Configure email notifications
    console.log(`Configuring email notifications for ${TEST_EMAIL}...`);
    await configureWorkflowNotifications(workflow.id, TEST_EMAIL);
    console.log('Email notifications configured successfully');
    
    // Step 3: Run the workflow steps
    console.log('Running first workflow step...');
    const step1Result = await runWorkflow(workflow.id);
    console.log(`After step 1: Status = ${step1Result.status}, Step = ${step1Result.currentStep}`);
    
    // Run second (final) step
    console.log('Running second workflow step (final)...');
    const finalResult = await runWorkflow(workflow.id);
    console.log(`After step 2: Status = ${finalResult.status}, Step = ${finalResult.currentStep}`);
    
    // Step 4: Send workflow notifications
    console.log(`Sending workflow notifications for workflow ${workflow.id}...`);
    const emailResult = await sendWorkflowNotifications(workflow.id);
    console.log('Notification result:', emailResult);
    
    // Wait for 2 seconds to allow email sending to complete
    await setTimeout(2000);
    
    console.log('Test completed. Check the Ethereal URL above to view the email.');
    
  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run the test
testWorkflowEmailWithNodemailer()
  .then(() => {
    console.log('Workflow email test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });