/**
 * Test script for Workflow Email Notifications with Database Storage
 * This script demonstrates configuring and testing email notifications for workflows
 * using the persistent email notification system
 * 
 * Usage: node test-workflow-email-notifications.js <recipient-email>
 * Example: node test-workflow-email-notifications.js user@example.com
 */

import { db } from './src/shared/db.js';
import * as workflowService from './src/services/workflowService.js';
import * as workflowEmailService from './src/services/workflowEmailService.js';
import * as mailerService from './src/services/mailerService.js';

/**
 * Test workflow email notifications
 */
async function testWorkflowEmailNotifications() {
  try {
    // Initialize mailer service
    mailerService.initialize({
      apiKey: process.env.SENDGRID_API_KEY,
      defaultSender: 'workflow-notifications@example.com'
    });
    
    console.log('Testing Workflow Email Notifications...');
    
    // Get recipient email from command line args or use a default
    const recipientEmail = process.argv[2] || 'test@example.com';
    console.log(`Using recipient email: ${recipientEmail}`);
    
    // Create a test workflow
    console.log('Creating test workflow...');
    const workflow = await workflowService.createWorkflow({
      name: 'Email Notification Test',
      description: 'A test workflow for email notifications',
      steps: [
        {
          id: '1',
          name: 'Test Step 1',
          type: 'custom',
          config: {
            operation: 'test',
            data: { foo: 'bar' }
          }
        }
      ]
    });
    
    console.log(`Created workflow: ${workflow.id}`);
    
    // Configure email notifications
    console.log('Configuring email notifications...');
    await workflowEmailService.configureEmailNotifications(
      workflow.id,
      recipientEmail,
      {
        sendOnCompletion: true,
        sendOnFailure: true
      }
    );
    
    console.log('Email notifications configured');
    
    // Get notification settings
    const settings = await workflowEmailService.getEmailNotificationSettings(workflow.id);
    console.log('Notification settings:', settings);
    
    // Mark workflow as completed to trigger notification
    console.log('Marking workflow as completed...');
    await db.update(workflowService.workflows)
      .set({
        status: 'completed',
        result: JSON.stringify({ success: true, message: 'Test completed' }),
        updatedAt: new Date()
      })
      .where(workflowService.eq(workflowService.workflows.id, workflow.id));
    
    // Manually send notification
    console.log('Sending workflow completion email...');
    const result = await workflowEmailService.sendWorkflowCompletionEmail(workflow.id);
    
    console.log('Email sending result:', result);
    
    // Get email logs
    const logs = await workflowEmailService.getEmailLogs(workflow.id);
    console.log('Email logs:', logs);
    
    // Clean up
    console.log('Cleaning up...');
    await workflowEmailService.deleteEmailNotificationSettings(workflow.id);
    await workflowService.deleteWorkflow(workflow.id);
    
    console.log('Email notification test completed successfully');
  } catch (error) {
    console.error('Error testing workflow email notifications:', error);
  } finally {
    // Close the database connection
    await db.end();
  }
}

// Run the test
testWorkflowEmailNotifications();