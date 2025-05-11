/**
 * Test script for the email-based report ingestion feature
 * This allows easy verification of the email functionality.
 * 
 * To test, set these environment variables:
 * - EMAIL_USER - The email account username
 * - EMAIL_PASS - The email account password
 * - EMAIL_HOST - The IMAP server hostname
 * - EMAIL_PORT - IMAP server port (optional, default: 993)
 * - EMAIL_TLS - Use TLS (optional, default: true)
 * 
 * Usage: node test-email-ingestion.js <platform>
 * Example: node test-email-ingestion.js VinSolutions
 */

import { tryFetchReportFromEmail } from './dist/agents/ingestScheduledReport.js';

// Make sure the download directory exists
import fs from 'fs';
import path from 'path';
const downloadDir = './downloads';
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

async function testEmailIngestion() {
  const platform = process.argv[2] || 'VinSolutions';
  
  console.log(`----- Email Ingestion Test for ${platform} -----`);
  console.log('Email configuration:');
  console.log(`  User: ${process.env.EMAIL_USER || '(not set)'}`);
  console.log(`  Host: ${process.env.EMAIL_HOST || '(not set)'}`);
  console.log(`  Port: ${process.env.EMAIL_PORT || '993 (default)'}`);
  console.log(`  TLS: ${process.env.EMAIL_TLS !== 'false' ? 'enabled (default)' : 'disabled'}`);
  console.log('-------------------------------------------');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_HOST) {
    console.error('❌ Error: Missing required email configuration environment variables.');
    console.error('Please set EMAIL_USER, EMAIL_PASS, and EMAIL_HOST variables.');
    process.exit(1);
  }
  
  try {
    console.log(`Attempting to fetch report from emails for ${platform}...`);
    
    const startTime = Date.now();
    const filePath = await tryFetchReportFromEmail(platform);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (filePath) {
      console.log(`✅ Success! Report found in email (took ${duration}s)`);
      console.log(`File path: ${filePath}`);
      
      // Get file stats
      const stats = fs.statSync(filePath);
      console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // Display first 5 lines of the file
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').slice(0, 5);
      
      console.log('\nFile preview (first 5 lines):');
      console.log('-------------------------------------------');
      lines.forEach(line => console.log(line));
      console.log('-------------------------------------------');
    } else {
      console.log(`❌ No reports found in email (took ${duration}s)`);
      console.log('Check that your email account has received reports from this platform.');
    }
  } catch (error) {
    console.error('❌ Error during email ingestion:');
    console.error(error);
  }
}

testEmailIngestion().catch(console.error);