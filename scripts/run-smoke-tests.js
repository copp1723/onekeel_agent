/**
 * Smoke Test Runner for Insight Engine
 * 
 * This script runs smoke tests against real CRM data files
 * to verify the Insight Engine Stability features.
 * 
 * Usage:
 *   node scripts/run-smoke-tests.js [directory]
 * 
 * Where [directory] is an optional path to a directory containing CSV files.
 * If not provided, it will use the ./test-data directory.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  console.error('Set this environment variable before running smoke tests');
  process.exit(1);
}

// Main function
async function runSmokeTests() {
  try {
    // Get the directory from command line args or use default
    const testDirectory = process.argv[2] || './test-data';
    
    // Ensure directory exists
    if (!fs.existsSync(testDirectory)) {
      console.log(`Test directory ${testDirectory} not found, creating it...`);
      fs.mkdirSync(testDirectory, { recursive: true });
      console.log('Please add CSV files to this directory and run the script again.');
      console.log('Example: cp ~/Downloads/VinSolutions_export.csv ./test-data/');
      process.exit(0);
    }
    
    // Find all CSV files in the directory
    const files = fs.readdirSync(testDirectory)
      .filter(file => file.toLowerCase().endsWith('.csv'));
    
    if (files.length === 0) {
      console.log(`No CSV files found in ${testDirectory}`);
      console.log('Please add CSV files to this directory and run the script again.');
      console.log('Example: cp ~/Downloads/VinSolutions_export.csv ./test-data/');
      process.exit(0);
    }
    
    console.log('=== Insight Engine Smoke Tests ===');
    console.log(`Found ${files.length} CSV files in ${testDirectory}`);
    
    // Create results directory if it doesn't exist
    const resultsDir = './smoke-test-results';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Process each file
    const results = [];
    
    for (const [index, file] of files.entries()) {
      console.log(`\nTesting file ${index + 1}/${files.length}: ${file}`);
      
      // Determine platform from filename
      let platform = 'Unknown';
      if (file.includes('VinSolutions')) {
        platform = 'VinSolutions';
      } else if (file.includes('VAUTO')) {
        platform = 'VAUTO'; 
      }
      
      const filePath = path.join(testDirectory, file);
      const outputFile = path.join(resultsDir, `${path.basename(file, '.csv')}_results.txt`);
      
      try {
        // Run the test script
        console.log(`Running test with platform: ${platform}, file: ${filePath}`);
        const startTime = Date.now();
        
        const command = 
          `node test-crm-fetch-and-analyze-with-logging.js ${platform} 12345 "${filePath}" > "${outputFile}" 2>&1`;
        
        await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Verify results directory exists
        if (fs.existsSync('./results')) {
          const resultDirs = fs.readdirSync('./results');
          if (resultDirs.includes(platform)) {
            const success = true;
            results.push({ file, platform, success, duration, outputFile });
            console.log(`✓ Test PASSED (${duration}ms) - Results saved to ${outputFile}`);
          } else {
            const success = false;
            results.push({ file, platform, success, duration, outputFile, error: 'No results directory created' });
            console.log(`✗ Test FAILED (${duration}ms) - No platform directory created`);
          }
        } else {
          const success = false;
          results.push({ file, platform, success, duration, outputFile, error: 'No results directory created' });
          console.log(`✗ Test FAILED (${duration}ms) - No results directory created`);
        }
      } catch (error) {
        results.push({ file, platform, success: false, outputFile, error: error.message });
        console.log(`✗ Test FAILED - ${error.message}`);
      }
    }
    
    // Print summary
    console.log('\n=== Smoke Test Summary ===');
    console.log(`Total tests: ${results.length}`);
    console.log(`Passed: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);
    
    console.log('\nDetails:');
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.file} (${result.platform}) - ${result.success ? 'PASSED' : 'FAILED'}`);
      if (result.duration) {
        console.log(`   Duration: ${result.duration}ms`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log(`   Results: ${result.outputFile}`);
    });
    
    // Write results to a file
    const summaryFile = path.join(resultsDir, `smoke_test_summary_${new Date().toISOString().replace(/:/g, '-')}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(results, null, 2));
    console.log(`\nSummary saved to: ${summaryFile}`);
    
  } catch (error) {
    console.error('Error running smoke tests:', error);
  }
}

// Run the script
runSmokeTests();