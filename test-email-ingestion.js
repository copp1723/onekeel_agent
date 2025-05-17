/**
 * Test Email Ingestion Service
 *
 * This script tests the enhanced email ingestion service for a specified platform.
 *
 * To test, set these environment variables:
 *
 * For email ingestion:
 * - EMAIL_USER - The email account username
 * - EMAIL_PASS - The email account password
 * - EMAIL_HOST - The IMAP server hostname
 * - EMAIL_PORT - IMAP server port (optional, default: 993)
 * - EMAIL_TLS - Use TLS (optional, default: true)
 *
 * Usage: node test-email-ingestion.js <platform>
 * Example: node test-email-ingestion.js VinSolutions
 */

import { ingestReportFromEmail } from './dist/agents/emailIngestService.js';

// Make sure the download directory exists
import fs from 'fs';
import path from 'path';
const downloadDir = './downloads';
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

async function testEmailIngestion() {
  // Parse command line arguments
  const platform = process.argv[2] || 'VinSolutions';

  console.log(`\n===== EMAIL INGESTION TEST FOR ${platform} =====`);
  console.log('Email configuration:');
  console.log(`  User: ${process.env.EMAIL_USER || '(not set)'}`);
  console.log(`  Host: ${process.env.EMAIL_HOST || '(not set)'}`);
  console.log(`  Port: ${process.env.EMAIL_PORT || '993 (default)'}`);
  console.log(`  TLS: ${process.env.EMAIL_TLS !== 'false' ? 'enabled (default)' : 'disabled'}`);
  console.log('-------------------------------------------');

  // Check if required environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_HOST) {
    console.error('❌ Error: Missing required email configuration environment variables.');
    console.error('Please set EMAIL_USER, EMAIL_PASS, and EMAIL_HOST variables.');
    process.exit(1);
  }

  try {
    console.log(`Starting email ingestion for ${platform}...`);

    const startTime = Date.now();
    const result = await ingestReportFromEmail(platform, {
      downloadDir,
      intent: 'sales_report',
      generateInsights: true,
      storeResults: true,
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.success) {
      console.log(`\n✅ Report ingested successfully in ${duration}s`);
      console.log(`Platform: ${result.platform}`);
      console.log(`Files: ${result.filePaths.join(', ')}`);

      if (result.parsedData) {
        console.log(`Parsed ${result.parsedData.recordCount} records`);
      }

      if (result.insights) {
        console.log(`Generated ${result.insights.length} insights`);
      }

      // Display file preview for the first file
      if (result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const stats = fs.statSync(filePath);
        console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);

        // Display first 5 lines of the file
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').slice(0, 5);

        console.log('\nFile preview:');
        console.log('-----------------------------------');
        lines.forEach(line => console.log(line));
        console.log('-----------------------------------');
      }
    } else {
      console.error(`\n❌ Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

testEmailIngestion().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});