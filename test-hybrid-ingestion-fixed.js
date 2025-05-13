/**
 * Test script for the hybrid ingestion orchestrator
 * This tests the full hybrid approach with both email and browser fallback
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
 * For browser automation fallback:
 * - VIN_SOLUTIONS_USERNAME - VinSolutions login username
 * - VIN_SOLUTIONS_PASSWORD - VinSolutions login password
 * - OTP_EMAIL_USER - Email for OTP (if needed)
 * - OTP_EMAIL_PASS - Password for OTP email
 * 
 * For testing with sample data:
 * - USE_SAMPLE_DATA=true - Skip actual API calls and use sample data
 * 
 * Usage: node test-hybrid-ingestion-fixed.js <platform>
 * Example: node test-hybrid-ingestion-fixed.js VinSolutions
 */

import { hybridIngestAndRunFlow } from './dist/agents/hybridIngestAndRunFlow.js';

// Make sure the download directory exists
import fs from 'fs';
import path from 'path';
const downloadDir = './downloads';
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

async function testHybridIngestion() {
  // Parse command line arguments
  const platform = process.argv[2] || 'VinSolutions';
  
  console.log(`\n===== HYBRID INGESTION TEST FOR ${platform} =====`);
  
  // Set up environment variables
  const envVars = {
    DOWNLOAD_DIR: downloadDir
  };
  
  // Add required environment variables based on platform
  if (platform.toLowerCase() === 'vinsolutions') {
    envVars.VIN_SOLUTIONS_USERNAME = process.env.VIN_SOLUTIONS_USERNAME || '';
    envVars.VIN_SOLUTIONS_PASSWORD = process.env.VIN_SOLUTIONS_PASSWORD || '';
    envVars.OTP_EMAIL_USER = process.env.OTP_EMAIL_USER || '';
    envVars.OTP_EMAIL_PASS = process.env.OTP_EMAIL_PASS || '';
  } else if (platform.toLowerCase() === 'vauto') {
    envVars.VAUTO_USERNAME = process.env.VAUTO_USERNAME || '';
    envVars.VAUTO_PASSWORD = process.env.VAUTO_PASSWORD || '';
  }
  
  // Check environment variables for each path
  console.log('Environment check:');
  console.log(`  Email path:  ${process.env.EMAIL_USER ? '✅' : '❌'} EMAIL_USER`);
  console.log(`              ${process.env.EMAIL_PASS ? '✅' : '❌'} EMAIL_PASS`);
  console.log(`              ${process.env.EMAIL_HOST ? '✅' : '❌'} EMAIL_HOST`);
  
  if (platform.toLowerCase() === 'vinsolutions') {
    console.log(`  Browser path: ${process.env.VIN_SOLUTIONS_USERNAME ? '✅' : '❌'} VIN_SOLUTIONS_USERNAME`);
    console.log(`               ${process.env.VIN_SOLUTIONS_PASSWORD ? '✅' : '❌'} VIN_SOLUTIONS_PASSWORD`);
    console.log(`               ${process.env.OTP_EMAIL_USER ? '✅' : '❌'} OTP_EMAIL_USER`);
    console.log(`               ${process.env.OTP_EMAIL_PASS ? '✅' : '❌'} OTP_EMAIL_PASS`);
  } else if (platform.toLowerCase() === 'vauto') {
    console.log(`  Browser path: ${process.env.VAUTO_USERNAME ? '✅' : '❌'} VAUTO_USERNAME`);
    console.log(`               ${process.env.VAUTO_PASSWORD ? '✅' : '❌'} VAUTO_PASSWORD`);
  }
  
  console.log('=================================================\n');
  
  try {
    console.log(`Starting hybrid ingestion for ${platform}...`);
    
    const startTime = Date.now();
    const filePath = await hybridIngestAndRunFlow(platform, envVars);
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

testHybridIngestion().catch(console.error);