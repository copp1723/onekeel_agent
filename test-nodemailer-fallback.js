/**
 * Test script for Nodemailer fallback in mailer service
 * This script tests the alternative mailer implementation with Nodemailer fallback
 * 
 * Usage: node test-nodemailer-fallback.js
 */

import dotenv from 'dotenv';
import { initializeMailer, sendEmail } from './src/services/mailerServiceAlternative.js';

// Load environment variables
dotenv.config();

if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY environment variable is not set');
  console.error('Email delivery will not work without a valid SendGrid API key');
  process.exit(1);
}

if (!process.env.TEST_EMAIL_ADDRESS) {
  console.error('TEST_EMAIL_ADDRESS environment variable is not set');
  console.error('Please set TEST_EMAIL_ADDRESS to a valid email address for testing');
  process.exit(1);
}

async function testNodemailerFallback() {
  console.log('Testing Nodemailer fallback in mailer service...');
  
  try {
    // Initialize the mailer service with SendGrid API key
    const initialized = initializeMailer(process.env.SENDGRID_API_KEY);
    console.log('Mailer initialized:', initialized);
    
    const recipientEmail = process.env.TEST_EMAIL_ADDRESS;
    console.log(`Sending test email to ${recipientEmail}...`);
    
    // Attempt to send email (this will likely fail with SendGrid and fall back to Nodemailer)
    const result = await sendEmail(
      recipientEmail,
      'Test Email with Nodemailer Fallback',
      'This is a test email using the Nodemailer fallback system.',
      `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 4px;">
          <h2 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Nodemailer Fallback Test</h2>
          
          <div style="margin: 20px 0; color: #34495e;">
            <p>This is a test email using the Nodemailer fallback system.</p>
            <p>The email should be delivered via the Ethereal test email service when SendGrid fails due to sender verification.</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #2c3e50;">Test Information</h3>
            <ul style="padding-left: 20px;">
              <li><strong>Service:</strong> Nodemailer Fallback</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
        </div>
      `,
      recipientEmail // Using the same email as both from and to address
    );
    
    console.log('Email result:', result);
    
    if (result.success) {
      console.log('Test email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.error('Failed to send test email:', result.error);
    }
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the test
testNodemailerFallback()
  .then(() => {
    console.log('Test completed');
  })
  .catch(error => {
    console.error('Test failed:', error);
  });