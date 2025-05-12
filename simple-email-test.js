/**
 * Simple Email Test Script
 * Tests basic email sending with SendGrid
 * 
 * Usage: node simple-email-test.js <recipient-email>
 */

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

// Load environment variables
dotenv.config();

// Recipient email should be provided as command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('Please provide a recipient email address as an argument');
  console.error('Usage: node simple-email-test.js <recipient-email>');
  process.exit(1);
}

if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY environment variable is not set');
  console.error('Email delivery will not work without a valid SendGrid API key');
  process.exit(1);
}

// Initialize the SendGrid client
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testEmailSending() {
  console.log(`Testing email delivery to ${recipientEmail}...`);
  
  try {
    // Create a test email message
    const msg = {
      to: recipientEmail,
      from: recipientEmail, // Use the recipient as the verified sender for testing
      subject: 'Workflow System - Email Test',
      text: 'This is a test email from your workflow system.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 4px;">
          <h2 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Workflow System Test</h2>
          
          <div style="margin: 20px 0; color: #34495e;">
            <p>This is a test email from your workflow system.</p>
            <p>If you received this, email delivery is working properly!</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #2c3e50;">Test Workflow Details</h3>
            <ul style="padding-left: 20px;">
              <li><strong>Status:</strong> Completed</li>
              <li><strong>Started:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Completed:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <div style="margin-top: 30px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; padding-top: 10px;">
            <p>This is an automated message from your workflow system. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };
    
    // Send the email
    console.log('Sending test email...');
    await sgMail.send(msg);
    
    console.log('Test email sent successfully!');
    console.log(`Please check your inbox at ${recipientEmail}`);
    
  } catch (error) {
    console.error('Error sending test email:');
    if (error.response) {
      console.error('SendGrid Error Response:');
      console.error(error.response.body);
    } else {
      console.error(error);
    }
  }
}

// Run the test
testEmailSending()
  .then(() => {
    console.log('Email test completed');
  })
  .catch(error => {
    console.error('Test failed:', error);
  });