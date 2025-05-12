/**
 * Test script for the Insight Engine Stability & Quality Upgrade
 * 
 * This script tests and demonstrates the enhanced features:
 * 1. Prompt version tracking
 * 2. Insight run metadata logging
 * 3. Output snapshotting to structured directories
 * 4. Optional insight quality scoring
 * 
 * To test:
 * 1. Ensure OPENAI_API_KEY is set in your environment
 * 2. Provide a sample CRM CSV file path as argument
 * 
 * Usage: node test-insight-engine-stability.js <csv-file-path>
 * Example: node test-insight-engine-stability.js ./downloads/VinSolutions_report.csv
 */

import { generateInsightsFromCSV } from './dist/agents/generateInsightsFromCSV.js';
import { getPromptByIntent, routerVersion } from './dist/prompts/promptRouter.js';
import { scoreInsightQuality } from './dist/agents/insightScorer.js';
import fs from 'fs';
import path from 'path';

async function testInsightEngineStability() {
  try {
    // Get command line args
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('No CSV file provided, using sample data approach instead');
      
      // If no file is provided, use sample CRM data
      const sampleCsvData = getSampleCRMData();
      await testWithContent(sampleCsvData);
      return;
    }
    
    const csvFilePath = args[0];
    
    // Validate file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`CSV file not found: ${csvFilePath}`);
      process.exit(1);
    }
    
    console.log('=== Insight Engine Stability & Quality Test ===');
    console.log(`Testing with file: ${csvFilePath}`);
    console.log(`Prompt Router Version: ${routerVersion}`);
    
    // Display prompt information
    const promptInfo = getPromptByIntent('automotive_analysis');
    console.log(`Using Prompt: automotive_analysis (${promptInfo.version})`);
    console.log('============');
    
    console.log('Generating insights...');
    const startTime = Date.now();
    
    // Generate insights with our upgraded system
    const insights = await generateInsightsFromCSV(csvFilePath, 'automotive_analysis');
    
    const endTime = Date.now();
    console.log(`Generation completed in ${endTime - startTime}ms`);
    
    // Display results
    console.log('\n=== Generated Insights ===');
    console.log(`Title: ${insights.title}`);
    console.log(`Description: ${insights.description.substring(0, 150)}...`);
    console.log('Action Items:');
    insights.actionItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item}`);
    });
    
    // Optional: Score the insight quality
    console.log('\n=== Scoring Insight Quality ===');
    console.log('Evaluating insight quality with LLM-based scoring...');
    const qualityScore = await scoreInsightQuality(insights);
    
    console.log(`Quality Score: ${qualityScore.score}/10`);
    console.log(`Feedback: ${qualityScore.feedback}`);
    console.log('Strengths:');
    qualityScore.strengths.forEach((str, i) => {
      console.log(`  + ${str}`);
    });
    console.log('Areas for Improvement:');
    qualityScore.weaknesses.forEach((weak, i) => {
      console.log(`  - ${weak}`);
    });
    
    // Check if logs/results directories were created
    console.log('\n=== Verifying Output Storage ===');
    const logsExist = fs.existsSync('./logs/insight_runs.log');
    console.log(`Logs directory created: ${logsExist ? 'Yes' : 'No'}`);
    
    const resultsExist = fs.existsSync('./results');
    console.log(`Results directory created: ${resultsExist ? 'Yes' : 'No'}`);
    
    if (resultsExist) {
      // List the stored results
      console.log('\nStored Result Directories:');
      const platforms = fs.readdirSync('./results');
      platforms.forEach(platform => {
        console.log(`- ${platform}/`);
        const dates = fs.readdirSync(path.join('./results', platform));
        dates.forEach(date => {
          const files = fs.readdirSync(path.join('./results', platform, date));
          console.log(`  - ${date}/ (${files.length} files)`);
        });
      });
    }
    
    console.log('\n=== Test Completed Successfully ===');
    
  } catch (error) {
    console.error('Error testing insight engine stability:', error);
  }
}

/**
 * Test with content instead of file
 */
async function testWithContent(csvContent) {
  try {
    console.log('=== Insight Engine Stability & Quality Test (Content Mode) ===');
    console.log(`Testing with direct CSV content (${csvContent.length} bytes)`);
    console.log(`Prompt Router Version: ${routerVersion}`);
    
    // Display prompt information
    const promptInfo = getPromptByIntent('automotive_analysis');
    console.log(`Using Prompt: automotive_analysis (${promptInfo.version})`);
    console.log('============');
    
    // Write content to temporary file
    const tempFilePath = './temp_csv_data.csv';
    fs.writeFileSync(tempFilePath, csvContent);
    
    console.log('Generating insights...');
    const startTime = Date.now();
    
    // Generate insights with our upgraded system
    const insights = await generateInsightsFromCSV(tempFilePath, 'automotive_analysis');
    
    const endTime = Date.now();
    console.log(`Generation completed in ${endTime - startTime}ms`);
    
    // Display results
    console.log('\n=== Generated Insights ===');
    console.log(`Title: ${insights.title}`);
    console.log(`Description: ${insights.description.substring(0, 150)}...`);
    console.log('Action Items:');
    insights.actionItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item}`);
    });
    
    // Optional: Score the insight quality
    console.log('\n=== Scoring Insight Quality ===');
    console.log('Evaluating insight quality with LLM-based scoring...');
    const qualityScore = await scoreInsightQuality(insights);
    
    console.log(`Quality Score: ${qualityScore.score}/10`);
    console.log(`Feedback: ${qualityScore.feedback}`);
    console.log('Strengths:');
    qualityScore.strengths.forEach((str, i) => {
      console.log(`  + ${str}`);
    });
    console.log('Areas for Improvement:');
    qualityScore.weaknesses.forEach((weak, i) => {
      console.log(`  - ${weak}`);
    });
    
    // Check if logs/results directories were created
    console.log('\n=== Verifying Output Storage ===');
    const logsExist = fs.existsSync('./logs/insight_runs.log');
    console.log(`Logs directory created: ${logsExist ? 'Yes' : 'No'}`);
    
    const resultsExist = fs.existsSync('./results');
    console.log(`Results directory created: ${resultsExist ? 'Yes' : 'No'}`);
    
    if (resultsExist) {
      // List the stored results
      console.log('\nStored Result Directories:');
      const platforms = fs.readdirSync('./results');
      platforms.forEach(platform => {
        console.log(`- ${platform}/`);
        const dates = fs.readdirSync(path.join('./results', platform));
        dates.forEach(date => {
          const files = fs.readdirSync(path.join('./results', platform, date));
          console.log(`  - ${date}/ (${files.length} files)`);
        });
      });
    }
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    console.log('\n=== Test Completed Successfully ===');
    
  } catch (error) {
    console.error('Error testing insight engine stability:', error);
  }
}

/**
 * Returns sample CRM data for testing when no file is provided
 */
function getSampleCRMData() {
  return `Date,Customer,Vehicle,SalesPerson,SaleType,SaleAmount
2025-04-15,John Doe,2023 Toyota Camry,Alice Smith,New,32500
2025-04-16,Jane Smith,2022 Honda Accord,Bob Jones,Used,22750
2025-04-16,Mark Johnson,2025 Ford F-150,Carol Davis,New,48900
2025-04-17,Sarah Williams,2024 Chevy Equinox,Alice Smith,New,34200
2025-04-17,Michael Brown,2021 BMW 3 Series,Dave Wilson,Used,29800
2025-04-18,Jennifer Davis,2025 Tesla Model Y,Carol Davis,New,52400
2025-04-18,Robert Miller,2022 Nissan Altima,Bob Jones,Used,19500
2025-04-19,William Wilson,2024 Audi Q5,Alice Smith,New,46700
2025-04-19,Elizabeth Taylor,2023 Hyundai Sonata,Dave Wilson,Used,24300
2025-04-20,Richard Moore,2025 Lexus RX,Carol Davis,New,54900`;
}

// Run the test
testInsightEngineStability();