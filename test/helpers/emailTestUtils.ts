import fs from 'fs';
import path from 'path';
import { simpleParser } from 'mailparser';
import { testEmailConfig } from '../emailTestConfig';

/**
 * Read an email fixture file
 */
export async function readEmailFixture(fixturePath: string): Promise<Buffer> {
  const fullPath = path.join(process.cwd(), fixturePath);
  return fs.promises.readFile(fullPath);
}

/**
 * Parse an email file and return its structure
 */
export async function parseEmail(emailPath: string): Promise<any> {
  const emailBuffer = await readEmailFixture(emailPath);
  return simpleParser(emailBuffer);
}

/**
 * Generate test email content with attachments
 */
export function createTestEmail(options: {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType: string;
  }>;
}): string {
  const boundary = '----test-boundary';
  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  
  let email = [
    `From: ${options.from}`,
    `To: ${to}`,
    `Subject: ${options.subject}`,
    'MIME-Version: 1.0',
  ];

  if (options.attachments?.length) {
    email.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    email.push('');
    
    // Add text/plain part
    if (options.text) {
      email = email.concat([
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        options.text,
        ''
      ]);
    }
    
    // Add HTML part if provided
    if (options.html) {
      email = email.concat([
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        options.html,
        ''
      ]);
    }
    
    // Add attachments
    for (const attachment of options.attachments) {
      const content = Buffer.isBuffer(attachment.content) 
        ? attachment.content.toString('base64')
        : Buffer.from(attachment.content).toString('base64');
      
      email = email.concat([
        `--${boundary}`,
        `Content-Type: ${attachment.contentType}`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        '',
        content,
        ''
      ]);
    }
    
    email.push(`--${boundary}--`);
  } else if (options.html) {
    email = email.concat([
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      options.html
    ]);
  } else {
    email = email.concat([
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      options.text || ''
    ]);
  }
  
  return email.join('\r\n');
}

/**
 * Generate a test email with a CSV attachment
 */
export function createTestEmailWithCsvAttachment(options: {
  from: string;
  to: string | string[];
  subject: string;
  text: string;
  csvData: string[][];
  filename?: string;
}): string {
  const csvContent = options.csvData.map(row => row.join(',')).join('\n');
  
  return createTestEmail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    attachments: [{
      filename: options.filename || 'report.csv',
      content: csvContent,
      contentType: 'text/csv',
    }],
  });
}

/**
 * Wait for a condition to be true with a timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 10000,
  interval = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await Promise.resolve(condition());
    if (result) return true;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Generate a unique test email address
 */
export function generateTestEmail(prefix = 'test'): string {
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${random}@test.example.com`;
}
