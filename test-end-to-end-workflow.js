/**
 * End-to-End Test: Vendor Report to AI Insights
 * 
 * This script tests the complete workflow:
 * 1. Simulates receiving a report from a vendor (VinSolutions)
 * 2. Processes the report through the system
 * 3. Generates AI insights
 * 4. Verifies the results
 * 
 * Usage: 
 *   node test-end-to-end-workflow.js
 * 
 * Environment variables needed:
 * - OPENAI_API_KEY: Your OpenAI API key
 * - DATABASE_URL: Database connection string
 * - EMAIL_*: Email configuration (optional, for email testing)
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { db } from './src/shared/db.js';
import { reports } from './src/shared/report-schema'; // No .js extension needed as we're using ES modules
import { generateInsightFromReport } from './src/workers/generateInsightFromReport.js';

// Load environment variables
dotenv.config();

// Set up directories
const testDataDir = './test-data';
const resultsDir = './results';

// Create directories if they don't exist
[testDataDir, resultsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Sample report data (in a real scenario, this would come from the vendor)
const sampleReportData = {
  reportId: `report-${Date.now()}`,
  vendor: 'VinSolutions',
  date: new Date().toISOString(),
  data: [
    { customerId: 'C1001', name: 'John Doe', email: 'john.doe@example.com', phone: '555-0101', status: 'New Lead', lastContact: '2025-05-10' },
    { customerId: 'C1002', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-0102', status: 'Contacted', lastContact: '2025-05-11' },
    { customerId: 'C1003', name: 'Bob Johnson', email: 'bob.johnson@example.com', phone: '555-0103', status: 'Test Drive Scheduled', lastContact: '2025-05-12' },
    { customerId: 'C1004', name: 'Alice Brown', email: 'alice.brown@example.com', phone: '555-0104', status: 'Negotiation', lastContact: '2025-05-13' },
    { customerId: 'C1005', name: 'Charlie Wilson', email: 'charlie.wilson@example.com', phone: '555-0105', status: 'Closed - Won', lastContact: '2025-05-14' },
  ]
};

/**
 * Simulates receiving a report from a vendor
 */
async function receiveVendorReport() {
  console.log('🔍 Simulating receiving vendor report...');
  
  // In a real scenario, this would be an email attachment or API call
  const reportId = `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const reportPath = path.join(testDataDir, `${reportId}.json`);
  
  // Save the report
  fs.writeFileSync(reportPath, JSON.stringify(sampleReportData, null, 2));
  console.log(`✅ Saved vendor report to ${reportPath}`);
  
  return { reportId, reportPath };
}

/**
 * Processes the report through the system
 */
async function processReport(reportId, reportPath) {
  console.log('🔄 Processing report...');
  
  // In a real scenario, this would be handled by the email ingestion service
  const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  
  // Store the report in the database
  const [report] = await db.insert(reports).values({
    id: reportId,
    platform: reportData.vendor,
    reportData,
    status: 'received',
    receivedAt: new Date(),
    metadata: { source: 'test-end-to-end-workflow' }
  }).returning();
  
  console.log(`✅ Stored report in database with ID: ${report.id}`);
  return report;
}

/**
 * Main test function
 */
async function runEndToEndTest() {
  console.log('🚀 Starting end-to-end workflow test');
  
  try {
    // Step 1: Simulate receiving a vendor report
    const { reportId, reportPath } = await receiveVendorReport();
    
    // Step 2: Process the report
    const report = await processReport(reportId, reportPath);
    
    // Step 3: Generate insights
    console.log('🧠 Generating insights...');
    const insightResult = await generateInsightFromReport({
      reportId: report.id,
      platform: report.platform,
      options: {
        role: 'Dealership Manager',
        evaluateQuality: true
      }
    });
    
    console.log('🎉 Insight generation complete!');
    console.log('\n📊 INSIGHT GENERATION RESULTS:');
    console.log('----------------------------');
    console.log(`Status: ${insightResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Report ID: ${report.id}`);
    console.log(`Insight ID: ${insightResult.insightId || 'N/A'}`);
    
    if (insightResult.error) {
      console.error('❌ Error generating insights:', insightResult.error);
    } else {
      console.log('✅ Successfully generated insights from the report');
      
      // Save the insights to a file
      const insightsPath = path.join(resultsDir, `insights-${reportId}.json`);
      fs.writeFileSync(insightsPath, JSON.stringify(insightResult, null, 2));
      console.log(`📝 Insights saved to: ${insightsPath}`);
    }
    
    return { success: true, reportId, insightResult };
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
runEndToEndTest()
  .then(({ success }) => {
    console.log(`\nTest ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });
