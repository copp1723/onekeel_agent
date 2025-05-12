/**
 * Results Analyzer for Insight Engine
 * 
 * This script analyzes the results of the Insight Engine
 * runs to track metrics across different versions and datasets.
 * 
 * Usage:
 *   node scripts/analyze-results.js
 */

const fs = require('fs');
const path = require('path');

// Main function
async function analyzeResults() {
  try {
    console.log('=== Insight Engine Results Analysis ===');
    
    // Check if results directory exists
    if (!fs.existsSync('./results')) {
      console.log('No results directory found. Run tests first to generate results.');
      return;
    }
    
    // Get all platforms
    const platforms = fs.readdirSync('./results');
    console.log(`Found ${platforms.length} platforms: ${platforms.join(', ')}`);
    
    // Track overall stats
    let totalInsights = 0;
    let totalSuccessful = 0;
    let totalErrors = 0;
    let totalDuration = 0;
    const promptVersions = new Map();
    
    // Process each platform
    for (const platform of platforms) {
      console.log(`\nAnalyzing platform: ${platform}`);
      
      const platformPath = path.join('./results', platform);
      const dates = fs.readdirSync(platformPath);
      
      console.log(`Found ${dates.length} dates with results`);
      
      // Platform stats
      let platformInsights = 0;
      let platformSuccessful = 0;
      let platformErrors = 0;
      let platformDuration = 0;
      
      // Process each date
      for (const date of dates) {
        const datePath = path.join(platformPath, date);
        const files = fs.readdirSync(datePath);
        
        console.log(`  ${date}: ${files.length} files`);
        
        // Process each file
        for (const file of files) {
          const filePath = path.join(datePath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          
          try {
            const result = JSON.parse(content);
            
            // Count insights
            totalInsights++;
            platformInsights++;
            
            // Check if it's an error or success
            if (result.metadata?.status === 'error' || result.error) {
              totalErrors++;
              platformErrors++;
            } else {
              totalSuccessful++;
              platformSuccessful++;
            }
            
            // Track duration
            if (result.metadata?.durationMs) {
              totalDuration += result.metadata.durationMs;
              platformDuration += result.metadata.durationMs;
            }
            
            // Track prompt versions
            if (result.metadata?.promptVersion) {
              const version = result.metadata.promptVersion;
              if (!promptVersions.has(version)) {
                promptVersions.set(version, 1);
              } else {
                promptVersions.set(version, promptVersions.get(version) + 1);
              }
            }
          } catch (error) {
            console.log(`    Error processing ${file}: ${error.message}`);
          }
        }
      }
      
      // Platform summary
      console.log(`  Platform Summary:`);
      console.log(`    Total Insights: ${platformInsights}`);
      console.log(`    Successful: ${platformSuccessful} (${((platformSuccessful / platformInsights) * 100).toFixed(1)}%)`);
      console.log(`    Errors: ${platformErrors} (${((platformErrors / platformInsights) * 100).toFixed(1)}%)`);
      if (platformInsights > 0) {
        console.log(`    Average Duration: ${(platformDuration / platformInsights).toFixed(0)}ms`);
      }
    }
    
    // Overall summary
    console.log('\n=== Overall Summary ===');
    console.log(`Total Insights Generated: ${totalInsights}`);
    console.log(`Successful: ${totalSuccessful} (${((totalSuccessful / totalInsights) * 100).toFixed(1)}%)`);
    console.log(`Errors: ${totalErrors} (${((totalErrors / totalInsights) * 100).toFixed(1)}%)`);
    if (totalInsights > 0) {
      console.log(`Average Duration: ${(totalDuration / totalInsights).toFixed(0)}ms`);
    }
    
    console.log('\nPrompt Versions:');
    for (const [version, count] of promptVersions.entries()) {
      console.log(`  ${version}: ${count} insights (${((count / totalInsights) * 100).toFixed(1)}%)`);
    }
    
    // Check logs
    if (fs.existsSync('./logs/insight_runs.log')) {
      const logStats = fs.statSync('./logs/insight_runs.log');
      console.log(`\nLog File Size: ${(logStats.size / 1024).toFixed(2)} KB`);
      
      // Count log entries
      const logContent = fs.readFileSync('./logs/insight_runs.log', 'utf-8');
      const logEntries = logContent.split('[INFO] Insight Generation Run').length - 1;
      console.log(`Log Entries: ${logEntries}`);
    } else {
      console.log('\nNo log file found at ./logs/insight_runs.log');
    }
    
  } catch (error) {
    console.error('Error analyzing results:', error);
  }
}

// Run the script
analyzeResults();