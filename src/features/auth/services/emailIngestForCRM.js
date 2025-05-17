/**
 * Email-Only Ingestion Agent for CRM Reports
 * 
 * This module handles email-based ingestion for retrieving CRM reports:
 * - Searches for reports in configured email accounts
 * - Downloads attachments and saves them to the specified directory
 * - Provides detailed error handling for email-related issues
 */

import fs from 'fs';
import path from 'path';
import { tryFetchReportFromEmail } from './ingestScheduledReport.js';

// Set download directory
const downloadDir = process.env.DOWNLOAD_DIR || './downloads';
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

/**
 * Email-only ingestion function for CRM reports
 * 
 * @param {string} platform - CRM platform name (e.g., "VinSolutions", "VAUTO")
 * @param {Object} options - Optional configuration options
 * @returns {Promise<string>} - Path to the downloaded report
 * @throws {Error} - If email ingestion fails or email is not configured
 */
export async function emailIngestForCRM(platform, options = {}) {
  console.log(`[INFO] Starting email-only ingestion for ${platform}`);
  
  // Check if we're using sample data for testing
  if (process.env.USE_SAMPLE_DATA === 'true') {
    console.log('[INFO] Using sample data mode');
    return createSampleReport(platform);
  }
  
  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_HOST) {
    throw new Error('Email configuration is missing. Please set EMAIL_USER, EMAIL_PASS, and EMAIL_HOST environment variables.');
  }
  
  try {
    console.log(`[INFO] Attempting email ingestion for ${platform}...`);
    const reportPath = await tryFetchReportFromEmail(platform);
    
    if (reportPath) {
      console.log(`[INFO] Successfully retrieved report from email: ${reportPath}`);
      return reportPath;
    } else {
      throw new Error(`No report found in email for ${platform}. Please check that scheduled reports are being sent to the configured email account.`);
    }
  } catch (error) {
    console.error(`[ERROR] Email ingestion failed: ${error.message}`);
    throw new Error(`Email ingestion failed: ${error.message}`);
  }
}

/**
 * Create a sample report file for testing
 * 
 * @param {string} platform - CRM platform name
 * @returns {Promise<string>} - Path to the created sample report
 */
async function createSampleReport(platform) {
  // Create a unique filename
  const reportFileName = `${platform}_report_${Date.now()}.csv`;
  const reportPath = path.join(downloadDir, reportFileName);
  
  // Create a sample report with example data
  const sampleData = `Date,Customer,Vehicle,Status,Price,LeadSource,SalesPerson,DaysOnLot
2025-05-13,Customer A,Toyota Camry SE,New Lead,$28500,Website,Rep 1,15
2025-05-13,Customer B,Honda Accord LX,Test Drive,$31200,Phone,Rep 2,22
2025-05-13,Customer C,Ford F-150 XLT,Negotiation,$42750,Walk-in,Rep 3,8
2025-05-13,Customer D,Chevrolet Tahoe LT,Purchased,$55300,Referral,Rep 1,30
2025-05-13,Customer E,Nissan Altima S,New Lead,$26400,Website,Rep 4,12`;
  
  fs.writeFileSync(reportPath, sampleData);
  console.log(`[INFO] Created sample report at ${reportPath}`);
  
  return reportPath;
}

// Export the email-only ingestion function
export default emailIngestForCRM;
