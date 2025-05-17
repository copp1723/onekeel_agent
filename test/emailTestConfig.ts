/**
 * Test configuration for email testing
 * This file contains test credentials and settings for the email testing environment
 */

export const testEmailConfig = {
  // Test SMTP server (MailHog)
  smtp: {
    host: 'localhost',
    port: 1025, // MailHog SMTP port
    secure: false,
    ignoreTLS: true,
  },
  
  // IMAP settings (MailHog doesn't support IMAP, these are for reference)
  imap: {
    host: 'localhost',
    port: 1143, // Note: MailHog doesn't support IMAP
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'testpass',
    },
  },
  
  // Test email accounts
  testAccounts: {
    sender: 'test.sender@example.com',
    receiver: 'test.receiver@example.com',
  },
  
  // Paths to test fixtures
  fixtures: {
    emails: {
      valid: 'test/fixtures/emails/valid',
      invalid: 'test/fixtures/emails/invalid',
      attachments: 'test/fixtures/emails/attachments',
    },
  },
  
  // Test timeouts
  timeouts: {
    emailProcessing: 30000, // 30 seconds
    testCase: 60000, // 60 seconds
  },
};

// Environment variables for testing
export const testEnvVars = {
  NODE_ENV: 'test',
  EMAIL_HOST: 'localhost',
  EMAIL_PORT: '1025',
  EMAIL_USER: 'test@example.com',
  EMAIL_PASS: 'testpass',
  EMAIL_FROM: 'test@example.com',
  EMAIL_TLS: 'false',
};
