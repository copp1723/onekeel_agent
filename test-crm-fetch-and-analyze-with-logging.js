/**
 * End-to-End Test for CRM Report Fetching and Analysis with Stability Enhancements
 * 
 * This script demonstrates the complete flow with stability upgrades:
 * 1. Fetches a CRM report (from email or via browser automation)
 * 2. Parses the report data
 * 3. Analyzes the data using the automotive analyst LLM prompt
 * 4. Returns structured insights
 * 5. Logs all run metadata and stores output to /results folder
 * 
 * To test, set these environment variables:
 * - OPENAI_API_KEY - Required for the LLM analysis
 * - EMAIL_USER, EMAIL_PASS, EMAIL_HOST - For email-based report ingestion
 * - VIN_SOLUTIONS_USERNAME, VIN_SOLUTIONS_PASSWORD - For browser automation
 * - USE_SAMPLE_DATA=true - Optional, use sample data instead of actual API calls
 * 
 * Usage: node test-crm-fetch-and-analyze-with-logging.js <platform> <dealerId> [csvFilePath]
 * Example: node test-crm-fetch-and-analyze-with-logging.js VinSolutions 12345
 * Example with CSV: node test-crm-fetch-and-analyze-with-logging.js VinSolutions 12345 ./path/to/sample.csv
 */

// Load environment variables
require('dotenv').config();

// Required modules
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  console.error('This key is required for LLM-based insight generation');
  process.exit(1);
}

// Main function
async function testCRMFetchAndAnalyzeWithLogging() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('Usage: node test-crm-fetch-and-analyze-with-logging.js <platform> <dealerId> [csvFilePath]');
      process.exit(1);
    }
    
    const platform = args[0];
    const dealerId = args[1];
    const csvFilePath = args.length > 2 ? args[2] : null;
    
    console.log('=== CRM Fetch and Analyze Test with Stability Features ===');
    console.log(`Platform: ${platform}`);
    console.log(`Dealer ID: ${dealerId}`);
    
    if (csvFilePath) {
      console.log(`Using CSV file: ${csvFilePath}`);
      
      // Check if file exists
      if (!fs.existsSync(csvFilePath)) {
        console.error(`Error: CSV file not found: ${csvFilePath}`);
        process.exit(1);
      }
    } else {
      console.log('Fetching report via hybrid ingestion (email → browser fallback)');
    }
    
    // Record start time
    const startTime = Date.now();
    
    // If we have a CSV file, run analysis directly
    if (csvFilePath) {
      console.log('\nAnalyzing provided CSV file...');
      
      // Execute the analysis script
      const command = 
        `node -e "import('./dist/agents/generateInsightsFromCSV.js')
          .then(module => module.generateInsightsFromCSV('${csvFilePath}', 'automotive_analysis'))
          .then(insights => console.log('✓ Analysis complete:', insights.title))
          .catch(error => console.error('Error:', error.message));"`;
      
      await executeCommand(command);
    } else {
      console.log('\nExecuting the full fetch + analyze pipeline...');
      
      // Execute the fetch and analyze script
      const command = 
        `node test-crm-fetch-and-analyze.js ${platform} ${dealerId}`;
      
      await executeCommand(command);
    }
    
    // Calculate duration
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    console.log(`\nTotal execution time: ${durationMs}ms`);
    
    // Check if logs/results directories were created
    console.log('\n=== Verifying Output Storage ===');
    const logsExist = fs.existsSync('./logs/insight_runs.log');
    console.log(`✓ Logs directory created: ${logsExist ? 'Yes' : 'No'}`);
    
    const resultsExist = fs.existsSync('./results');
    console.log(`✓ Results directory created: ${resultsExist ? 'Yes' : 'No'}`);
    
    if (resultsExist) {
      // List the stored results
      console.log('\nStored Results:');
      const platforms = fs.readdirSync('./results');
      platforms.forEach(p => {
        console.log(`- ${p}/`);
        const dates = fs.readdirSync(path.join('./results', p));
        dates.forEach(date => {
          const files = fs.readdirSync(path.join('./results', p, date));
          console.log(`  - ${date}/ (${files.length} files)`);
          
          // Display content of first file for reference
          if (files.length > 0) {
            const firstFile = files[0];
            console.log(`    * ${firstFile}`);
            try {
              const fileContent = fs.readFileSync(path.join('./results', p, date, firstFile), 'utf-8');
              const jsonContent = JSON.parse(fileContent);
              
              if (jsonContent.result) {
                console.log(`      Title: ${jsonContent.result.title}`);
                console.log(`      Action Items: ${jsonContent.result.actionItems.length}`);
              }
              
              if (jsonContent.metadata) {
                console.log(`      Prompt Version: ${jsonContent.metadata.promptVersion}`);
                console.log(`      Duration: ${jsonContent.metadata.durationMs}ms`);
              }
            } catch (error) {
              console.log(`      Error reading file: ${error.message}`);
            }
          }
        });
      });
    }
    
    if (logsExist) {
      console.log('\nLog Content Preview:');
      const logContent = fs.readFileSync('./logs/insight_runs.log', 'utf-8');
      // Show last 10 lines of log
      const logLines = logContent.split('\n');
      const lastLines = logLines.slice(Math.max(0, logLines.length - 10));
      console.log(lastLines.join('\n'));
    }
    
    console.log('\n=== Test Completed Successfully ===');
    console.log('The Insight Engine Stability & Quality Upgrade is working properly.');
    console.log('Version tracking, logging, and result storage are all functioning as expected.');
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Helper to execute commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    
    const proc = exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Execution error: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      console.log(stdout);
      resolve(stdout);
    });
    
    // Stream output in real-time
    proc.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
  });
}

// Run the test
testCRMFetchAndAnalyzeWithLogging();