/**
 * End-to-End Test for CRM Report Fetching and Analysis
 * 
 * This script demonstrates the complete flow:
 * 1. Fetches a CRM report (from email or via browser automation)
 * 2. Parses the report data
 * 3. Analyzes the data using the automotive analyst LLM prompt
 * 4. Returns structured insights
 * 
 * To test, set these environment variables:
 * - OPENAI_API_KEY - Required for the LLM analysis
 * - EMAIL_USER, EMAIL_PASS, EMAIL_HOST - For email-based report ingestion
 * - VIN_SOLUTIONS_USERNAME, VIN_SOLUTIONS_PASSWORD - For browser automation
 * - USE_SAMPLE_DATA=true - Optional, use sample data instead of actual API calls
 * 
 * Usage: node test-crm-fetch-and-analyze.js <platform> <dealerId>
 * Example: node test-crm-fetch-and-analyze.js VinSolutions 12345
 */

import { fetchAndAnalyzeCRMReport } from './dist/agents/fetchAndAnalyzeCRMReport.js';
import { getAvailableIntents } from './dist/prompts/promptRouter.js';

async function testCRMFetchAndAnalyze() {
  // Parse command line arguments
  const platform = process.argv[2] || 'VinSolutions';
  const dealerId = process.argv[3] || '12345';
  
  console.log('\n🚀 CRM REPORT FETCH AND ANALYSIS TEST');
  console.log('=============================================');
  console.log(`Platform: ${platform}`);
  console.log(`Dealer ID: ${dealerId}`);
  console.log(`Using sample data: ${process.env.USE_SAMPLE_DATA === 'true' ? 'Yes' : 'No'}`);
  
  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set.');
    console.error('Please set this environment variable to run the LLM analysis.');
    process.exit(1);
  }
  
  // Environment check for email ingestion
  console.log('\nEmail Ingestion Check:');
  console.log(`  EMAIL_USER: ${process.env.EMAIL_USER ? '✅' : '❌'}`);
  console.log(`  EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅' : '❌'}`);
  console.log(`  EMAIL_HOST: ${process.env.EMAIL_HOST ? '✅' : '❌'}`);
  
  // Environment check for browser automation
  console.log('\nBrowser Automation Check:');
  if (platform.toLowerCase() === 'vinsolutions') {
    console.log(`  VIN_SOLUTIONS_USERNAME: ${process.env.VIN_SOLUTIONS_USERNAME ? '✅' : '❌'}`);
    console.log(`  VIN_SOLUTIONS_PASSWORD: ${process.env.VIN_SOLUTIONS_PASSWORD ? '✅' : '❌'}`);
  } else if (platform.toLowerCase() === 'vauto') {
    console.log(`  VAUTO_USERNAME: ${process.env.VAUTO_USERNAME ? '✅' : '❌'}`);
    console.log(`  VAUTO_PASSWORD: ${process.env.VAUTO_PASSWORD ? '✅' : '❌'}`);
  }
  
  // Get available prompt intents
  const availableIntents = getAvailableIntents();
  console.log(`\nAvailable analysis intents: ${availableIntents.join(', ')}`);
  
  console.log('\n=============================================');
  
  try {
    console.log('Starting end-to-end flow...');
    const startTime = Date.now();
    
    // Execute the full flow
    const result = await fetchAndAnalyzeCRMReport({
      platform,
      dealerId,
      reportType: 'leads',
    });
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ End-to-end flow completed in ${totalDuration}s`);
    
    // Display the results
    console.log('\n=============================================');
    console.log('📊 REPORT INFORMATION:');
    console.log(`File path: ${result.reportData.filePath}`);
    console.log(`Total records: ${result.reportData.totalRecords}`);
    console.log(`Headers: ${result.reportData.headers.slice(0, 5).join(', ')}${result.reportData.headers.length > 5 ? '...' : ''}`);
    
    console.log('\n🧠 INSIGHTS:');
    console.log(`Title: ${result.insights.title}`);
    console.log('\nDescription:');
    console.log(result.insights.description);
    
    console.log('\nAction Items:');
    result.insights.actionItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item}`);
    });
    
    if (result.insights.dataPoints) {
      console.log('\nData Points:');
      for (const [key, value] of Object.entries(result.insights.dataPoints)) {
        console.log(`- ${key}: ${value}`);
      }
    }
    
    console.log('\n=============================================');
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    console.error('\n❌ ERROR DURING TEST:');
    console.error(error);
  }
}

testCRMFetchAndAnalyze().catch(console.error);