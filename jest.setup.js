// This file is run before each test file
// It's a good place to set up global mocks or environment variables
// @ts-nocheck

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.EKO_API_KEY = 'test-eko-api-key';
process.env.SENDGRID_API_KEY = 'test-sendgrid-api-key';
process.env.OTP_EMAIL_USER = 'test@example.com';
process.env.OTP_EMAIL_PASS = 'test-password';
process.env.EMAIL_HOST = 'imap.example.com';
process.env.EMAIL_PORT = '993';
process.env.EMAIL_TLS = 'true';
process.env.OTP_PATTERN = 'OTP is: (\\d{6})';
process.env.OTP_SUBJECT = 'Your OTP Code';

// Global test timeout (30 seconds)
jest.setTimeout(30000);
