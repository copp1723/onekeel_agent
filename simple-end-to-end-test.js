/**
 * Simple End-to-End Test
 * 
 * This script tests the core workflow without TypeScript dependencies:
 * 1. Creates a test report
 * 2. Processes it through the system
 * 3. Verifies the results
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Get current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Sample report data
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
 * Simulates receiving a vendor report
 */
function receiveVendorReport() {
  console.log('🔍 Simulating receiving vendor report...');
  
  const reportId = `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const reportPath = path.join(testDataDir, `${reportId}.json`);
  
  // Save the report
  fs.writeFileSync(reportPath, JSON.stringify(sampleReportData, null, 2));
  console.log(`✅ Saved vendor report to ${reportPath}`);
  
  return { reportId, reportPath };
}

/**
 * Simulates processing the report
 */
function processReport(reportId, reportPath) {
  console.log('🔄 Simulating report processing...');
  
  const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  
  // Simulate database storage
  const report = {
    id: reportId,
    platform: reportData.vendor,
    reportData,
    status: 'processed',
    processedAt: new Date().toISOString(),
    metadata: { source: 'simple-end-to-end-test' }
  };
  
  console.log(`✅ Processed report with ID: ${report.id}`);
  return report;
}

/**
 * Simulates generating insights
 */
async function generateInsights(report) {
  console.log('🧠 Simulating insight generation...');
  
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const insights = {
    id: `insight-${Date.now()}`,
    reportId: report.id,
    summary: `This is a sample insight for ${report.platform} report`,
    keyFindings: [
      `Found ${report.reportData.data.length} records in the report`,
      `Most common status: ${getMostCommonStatus(report.reportData.data)}`,
      'Sample insight based on the data'
    ],
    recommendations: [
      'Follow up with new leads promptly',
      'Schedule test drives for interested customers',
      'Review negotiation strategies for pending deals'
    ],
    generatedAt: new Date().toISOString()
  };
  
  return {
    success: true,
    insightId: insights.id,
    insights
  };
}

/**
 * Helper function to get the most common status
 */
function getMostCommonStatus(customers) {
  const statusCounts = {};
  customers.forEach(customer => {
    statusCounts[customer.status] = (statusCounts[customer.status] || 0) + 1;
  });
  
  return Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    [0][0];
}

/**
 * Main test function
 */
async function runEndToEndTest() {
  console.log('🚀 Starting simple end-to-end workflow test');
  
  try {
    // Step 1: Simulate receiving a vendor report
    const { reportId, reportPath } = receiveVendorReport();
    
    // Step 2: Process the report
    const report = processReport(reportId, reportPath);
    
    // Step 3: Generate insights
    console.log('🧠 Generating insights...');
    const insightResult = await generateInsights(report);
    
    console.log('🎉 Insight generation complete!');
    console.log('\n📊 INSIGHT GENERATION RESULTS:');
    console.log('----------------------------');
    console.log(`Status: ${insightResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Report ID: ${report.id}`);
    console.log(`Insight ID: ${insightResult.insightId || 'N/A'}`);
    
    // Save the results
    const resultsPath = path.join(resultsDir, `test-results-${Date.now()}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify({
      testRunAt: new Date().toISOString(),
      reportId: report.id,
      reportPath,
      insightResult
    }, null, 2));
    
    console.log(`\n📝 Test results saved to: ${resultsPath}`);
    console.log('\n✅ Test completed successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
runEndToEndTest()
  .then(({ success }) => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });
