/**
 * Test script for Automated Email Delivery functionality
 * This script demonstrates sending workflow summary emails with SendGrid
 * 
 * Usage: node test-email-delivery.js <recipient-email>
 * Example: node test-email-delivery.js user@example.com
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { workflows } from './dist/shared/schema.js';
import { initializeMailer } from './dist/services/mailerService.js';
import { sendWorkflowSummaryEmail } from './dist/services/workflowEmailService.js';

// Load environment variables
dotenv.config();

// Recipient email should be provided as command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('Please provide a recipient email address as an argument');
  console.error('Usage: node test-email-delivery.js <recipient-email>');
  process.exit(1);
}

if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY environment variable is not set');
  console.error('Email delivery will not work without a valid SendGrid API key');
  process.exit(1);
}

/**
 * Test email delivery by sending a workflow summary
 */
async function testEmailDelivery() {
  try {
    console.log('Testing Automated Email Delivery...');
    
    // Initialize the mailer service with the API key
    initializeMailer(process.env.SENDGRID_API_KEY);
    
    // Get the most recent completed workflow to use as an example
    const [recentWorkflow] = await db
      .select()
      .from(workflows)
      .where(workflows.status === 'completed')
      .orderBy(workflows.updatedAt, { direction: 'desc' })
      .limit(1);
    
    if (!recentWorkflow) {
      console.error('No completed workflows found in the database');
      console.log('Creating mock workflow data for testing...');
      
      // Create mock workflow data for testing
      const mockWorkflow = {
        id: 'mock-workflow-' + Date.now(),
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        lastUpdated: new Date(),
        context: {
          summary: 'This is a test workflow summary for email delivery testing',
          insights: [
            'Insight 1: Sales have increased by 15% in the past month',
            'Insight 2: Customer retention rate is above target at 82%',
            'Insight 3: New leads are up by 23% compared to last quarter'
          ],
          __lastStepResult: {
            success: true,
            message: 'Workflow completed successfully',
            timestamp: new Date().toISOString()
          }
        }
      };
      
      // Send email using mock data
      console.log(`Sending test email to ${recipientEmail}...`);
      
      const result = await sendWorkflowSummaryEmail({
        workflow: mockWorkflow,
        recipients: recipientEmail,
        subject: 'Test Email - Workflow Summary'
      });
      
      if (result) {
        console.log('Test email sent successfully!');
      } else {
        console.error('Failed to send test email');
      }
      
      return;
    }
    
    // Use a real workflow from the database
    console.log(`Using workflow ${recentWorkflow.id} as example data`);
    console.log(`Sending email to ${recipientEmail}...`);
    
    const result = await sendWorkflowSummaryEmail({
      workflow: recentWorkflow,
      recipients: recipientEmail,
      subject: 'Test Email - Workflow Summary'
    });
    
    if (result) {
      console.log('Email sent successfully!');
    } else {
      console.error('Failed to send email');
    }
  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run the test
testEmailDelivery()
  .then(() => {
    console.log('Email delivery test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });