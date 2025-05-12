/**
 * Basic Email Test Script
 * Tests email delivery using nodemailer with ethereal.email
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

async function testEmailDelivery() {
  try {
    console.log('Testing basic email delivery with nodemailer...');
    
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
    
    // Recipient email - using test email address or a default
    const recipientEmail = process.env.TEST_EMAIL_ADDRESS || 'test@example.com';
    console.log(`Sending test email to ${recipientEmail}...`);
    
    // Send email
    const info = await transporter.sendMail({
      from: testAccount.user,
      to: recipientEmail,
      subject: 'Workflow Email Notification Test',
      text: 'This is a test email for workflow notifications using nodemailer.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Notification Test</h2>
          <p>This is a test email for workflow notifications.</p>
          <p>The email is sent using nodemailer with ethereal.email.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin-top: 20px;">
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    });
    
    console.log('Message sent successfully!');
    console.log('Message ID:', info.messageId);
    
    // Generate and log preview URL
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('You can view the test email at the URL above.');
    
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Run the test
testEmailDelivery()
  .then(() => {
    console.log('Email test completed.');
  })
  .catch(error => {
    console.error('Test failed:', error);
  });