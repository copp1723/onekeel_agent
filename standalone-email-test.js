/**
 * Standalone Email Test Script
 * Tests workflow email notifications with nodemailer
 * This script mimics the workflow email service using direct API calls
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Test email address
const TEST_EMAIL = process.env.TEST_EMAIL_ADDRESS || 'workflow-test@example.com';

/**
 * Test workflow email notifications with Nodemailer
 */
async function testWorkflowEmails() {
  console.log('Testing Workflow Email Notifications with Nodemailer...');
  
  try {
    // Create a test account at ethereal.email (ephemeral test email service)
    console.log('Creating test account at ethereal.email...');
    const testAccount = await nodemailer.createTestAccount();
    console.log('Test account created:', testAccount.user);
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    // Create a mock workflow
    const mockWorkflow = {
      id: uuidv4(),
      name: 'Test Workflow',
      status: 'completed',
      currentStep: 2,
      totalSteps: 2,
      createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      completedAt: new Date(),
      context: {
        startedBy: 'email-test-script',
        initialData: {
          platform: 'VinSolutions',
          dealerId: '12345'
        },
        results: [
          { name: 'Sales Performance', value: 123 },
          { name: 'Customer Satisfaction', value: 4.8 },
          { name: 'Lead Conversion', value: '24%' }
        ],
        firstStepResult: {
          data: {
            processed: true,
            message: 'Data processed successfully'
          }
        },
        secondStepResult: {
          insights: [
            'Sales have increased by 15% compared to last month',
            'Customer satisfaction remains high at 4.8/5.0',
            'Lead conversion rate has improved to 24%, up from 18%'
          ],
          summary: 'Overall positive trends in dealership performance',
          timestamp: new Date().toISOString()
        }
      }
    };
    
    // Generate email content
    const emailSubject = `Workflow Summary: ${mockWorkflow.name} (ID: ${mockWorkflow.id})`;
    const emailText = generateWorkflowSummaryText(mockWorkflow);
    const emailHtml = generateWorkflowSummaryHtml(mockWorkflow);
    
    // Send the email
    console.log(`Sending workflow summary email to ${TEST_EMAIL}...`);
    const info = await transporter.sendMail({
      from: testAccount.user,
      to: TEST_EMAIL,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });
    
    console.log('Message sent successfully!');
    console.log('Message ID:', info.messageId);
    
    // Generate and log preview URL
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('You can view the test email at the URL above.');
    
    // Wait for 2 seconds to allow email sending to complete
    await setTimeout(2000);
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

/**
 * Generate plain text email content
 */
function generateWorkflowSummaryText(workflow) {
  const { id, name, status, createdAt, completedAt, context } = workflow;
  const elapsed = completedAt ? Math.round((completedAt - createdAt) / 1000) : 0;
  
  let text = `
WORKFLOW SUMMARY
===============

Workflow: ${name}
ID: ${id}
Status: ${status}
Started: ${createdAt.toLocaleString()}
${completedAt ? `Completed: ${completedAt.toLocaleString()}` : ''}
${elapsed ? `Duration: ${elapsed} seconds` : ''}

INSIGHTS
-------
`;

  // Add insights if available
  if (context && context.secondStepResult && context.secondStepResult.insights) {
    context.secondStepResult.insights.forEach(insight => {
      text += `- ${insight}\n`;
    });
    
    if (context.secondStepResult.summary) {
      text += `\nSUMMARY\n-------\n${context.secondStepResult.summary}\n`;
    }
  }
  
  text += `\n---\nThis is an automated email from the Workflow System.\nPlease do not reply to this email.`;
  
  return text;
}

/**
 * Generate HTML email content
 */
function generateWorkflowSummaryHtml(workflow) {
  const { id, name, status, createdAt, completedAt, context } = workflow;
  const elapsed = completedAt ? Math.round((completedAt - createdAt) / 1000) : 0;
  
  let insightsHtml = '';
  if (context && context.secondStepResult && context.secondStepResult.insights) {
    insightsHtml = context.secondStepResult.insights.map(insight => `<li>${insight}</li>`).join('');
  }
  
  let summaryHtml = '';
  if (context && context.secondStepResult && context.secondStepResult.summary) {
    summaryHtml = `
      <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #2c3e50;">Summary</h3>
        <p>${context.secondStepResult.summary}</p>
      </div>
    `;
  }
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 4px;">
      <h1 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Workflow Summary</h1>
      
      <div style="margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Workflow:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${id}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Status:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <span style="display: inline-block; padding: 2px 8px; background-color: ${status === 'completed' ? '#4caf50' : '#ff9800'}; color: white; border-radius: 4px;">${status.toUpperCase()}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Started:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${createdAt.toLocaleString()}</td>
          </tr>
          ${completedAt ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Completed:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${completedAt.toLocaleString()}</td>
          </tr>
          ` : ''}
          ${elapsed ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Duration:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${elapsed} seconds</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <div style="margin-top: 30px;">
        <h2 style="color: #2c3e50;">Insights</h2>
        <ul style="padding-left: 20px; line-height: 1.6;">
          ${insightsHtml}
        </ul>
      </div>
      
      ${summaryHtml}
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #7f8c8d; font-size: 12px;">
        <p>This is an automated email from the Workflow System.</p>
        <p>Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

// Run the test
testWorkflowEmails()
  .then(() => {
    console.log('Email test completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });