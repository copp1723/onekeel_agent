/**
 * Test script for the email-only ingestion orchestrator
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
 * For testing with sample data:
 * - USE_SAMPLE_DATA=true - Skip actual API calls and use sample data
 * 
 * Usage: node test-email-ingestion-fixed.js <platform>
 * Example: node test-email-ingestion-fixed.js VinSolutions
 */

import { emailIngestAndRunFlow } from './dist/agents/hybridIngestAndRunFlow.js';

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
  
  console.log(`\n===== EMAIL-ONLY INGESTION TEST FOR ${platform} =====`);
  
  // Set up environment variables
  const envVars = {
    DOWNLOAD_DIR: downloadDir
  };
  
  // Check environment variables
  console.log('Environment check:');
  console.log(`  Email path:  ${process.env.EMAIL_USER ? '✅' : '❌'} EMAIL_USER`);
  console.log(`              ${process.env.EMAIL_PASS ? '✅' : '❌'} EMAIL_PASS`);
  console.log(`              ${process.env.EMAIL_HOST ? '✅' : '❌'} EMAIL_HOST`);
  
  console.log('=================================================\n');
  
  try {
    console.log(`Starting email-only ingestion for ${platform}...`);
    
    const startTime = Date.now();
    const filePath = await emailIngestAndRunFlow(platform, envVars);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Report fetched successfully in ${duration}s`);
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
    console.log('\n=================================================');
    console.log(`✅ TEST COMPLETED SUCCESSFULLY`);
    
  } catch (error) {
    console.error(`\n❌ ERROR DURING TEST:`);
    console.error(error);
  }
}

testEmailIngestion().catch(console.error);
