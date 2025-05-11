/**
 * Comprehensive test script for CRM report fetching with email ingestion
 * Tests the full pipeline:
 * 1. Attempt to fetch reports from email
 * 2. Fall back to browser automation if needed
 * 3. Parse the resulting report
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
 * Usage: node test-crm-with-email.js <platform> <dealerId>
 * Example: node test-crm-with-email.js VinSolutions 12345
 */

import { fetchCRMReport, parseCRMReport } from './dist/agents/fetchCRMReport.js';

// Make sure the download directory exists
import fs from 'fs';
import path from 'path';
const downloadDir = './downloads';
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

async function testCRMWithEmail() {
  // Parse command line arguments
  const platform = process.argv[2] || 'VinSolutions';
  const dealerId = process.argv[3] || '12345';
  
  console.log(`\n===== CRM REPORT TEST WITH EMAIL INGESTION =====`);
  console.log(`Platform: ${platform}`);
  console.log(`Dealer ID: ${dealerId}`);
  console.log(`Using sample data: ${process.env.USE_SAMPLE_DATA === 'true' ? 'Yes' : 'No'}`);
  console.log(`=================================================\n`);
  
  try {
    console.log('1. FETCHING REPORT');
    console.log('-------------------');
    
    const startTime = Date.now();
    const filePath = await fetchCRMReport({
      platform,
      dealerId,
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Report fetched successfully in ${duration}s`);
    console.log(`File path: ${filePath}`);
    
    // Get file stats
    const stats = fs.statSync(filePath);
    console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    console.log('\n2. PARSING REPORT');
    console.log('-------------------');
    
    const report = await parseCRMReport(filePath);
    
    console.log(`✅ Report parsed successfully`);
    console.log(`Total records: ${report.totalRecords}`);
    console.log(`Headers: ${report.headers.slice(0, 5).join(', ')}${report.headers.length > 5 ? '...' : ''}`);
    
    // Show first 2 records
    console.log('\nSample data (first 2 records):');
    const sampleData = report.data.slice(0, 2);
    console.log(JSON.stringify(sampleData, null, 2));
    
    console.log('\n=================================================');
    console.log(`✅ TEST COMPLETED SUCCESSFULLY`);
    
  } catch (error) {
    console.error(`\n❌ ERROR DURING TEST:`);
    console.error(error);
  }
}

testCRMWithEmail().catch(console.error);