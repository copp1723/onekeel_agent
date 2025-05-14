/**
 * Test Data Flow Integration Pipeline
 * 
 * This script tests the complete data flow pipeline from email attachment
 * download to insight generation and storage.
 */

import dotenv from 'dotenv';
import { runSampleDataFlow } from './src/agents/emailIngestAndRunFlow.js';

// Load environment variables
dotenv.config();

// Get platform from command line arguments
const platform = process.argv[2] || 'VinSolutions';

/**
 * Main function to test the data flow
 */
async function main() {
  console.log('=== Testing Complete Data Flow Integration Pipeline ===');
  console.log(`Platform: ${platform}`);
  console.log('');
  
  try {
    console.log('Running sample data flow...');
    const startTime = Date.now();
    
    // Run the sample data flow
    const result = await runSampleDataFlow(platform, {
      intent: 'automotive_analysis'
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Data flow completed successfully!');
    console.log(`Total duration: ${duration}s`);
    console.log('');
    console.log('Results:');
    console.log(`- Report ID: ${result.reportId}`);
    console.log(`- Report Path: ${result.reportPath}`);
    console.log(`- JSON Path: ${result.jsonPath}`);
    
    if (result.insightId) {
      console.log(`- Insight ID: ${result.insightId}`);
      console.log(`- Insight Path: ${result.insightPath}`);
    }
    
    // Display the file structure
    console.log('\nFile Structure:');
    console.log(`- Report: ${result.reportPath}`);
    console.log(`- Parsed Data: ${result.jsonPath}`);
    if (result.insightPath) {
      console.log(`- Insight: ${result.insightPath}`);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\n❌ Error testing data flow:');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
