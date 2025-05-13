/**
 * Insight Engine Stability Test
 * 
 * This script tests the enhanced insight engine with quality scoring,
 * business impact assessment, and version tracking across multiple vendors.
 * 
 * Usage: node test-insight-engine-stability.js [vendor]
 * Example: node test-insight-engine-stability.js VinSolutions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Use sample data for testing
process.env.USE_SAMPLE_DATA = 'true';

// Create directories for the test
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sample vendor data for testing
 */
const sampleVendorData = {
  VinSolutions: {
    records: [
      { Date: '2025-05-13', Customer: 'Customer A', Vehicle: 'Honda Accord', Status: 'New Lead', Price: 32500, DaysOnLot: 15, LeadSource: 'Website', SalesPerson: 'Rep 1' },
      { Date: '2025-05-13', Customer: 'Customer B', Vehicle: 'Toyota Camry', Status: 'Test Drive', Price: 29800, DaysOnLot: 22, LeadSource: 'Phone', SalesPerson: 'Rep 2' },
      { Date: '2025-05-13', Customer: 'Customer C', Vehicle: 'Ford F-150', Status: 'Negotiation', Price: 45600, DaysOnLot: 8, LeadSource: 'Walk-in', SalesPerson: 'Rep 3' },
      { Date: '2025-05-13', Customer: 'Customer D', Vehicle: 'Chevrolet Tahoe', Status: 'Purchased', Price: 52300, DaysOnLot: 30, LeadSource: 'Referral', SalesPerson: 'Rep 1' },
      { Date: '2025-05-13', Customer: 'Customer E', Vehicle: 'Nissan Altima', Status: 'New Lead', Price: 26400, DaysOnLot: 12, LeadSource: 'Website', SalesPerson: 'Rep 4' }
    ]
  },
  VAUTO: {
    records: [
      { 'Report Date': '2025-05-13', 'Stock#': 'A123', 'VIN': '1HGCM82633A123456', 'Make': 'Honda', 'Model': 'Accord', 'Price': 32500, 'Cost': 29500, 'Age': 15, 'Category': 'Sedan', 'Source': 'Auction' },
      { 'Report Date': '2025-05-13', 'Stock#': 'B234', 'VIN': '2T1BU4EE2AC123456', 'Make': 'Toyota', 'Model': 'Camry', 'Price': 29800, 'Cost': 27000, 'Age': 22, 'Category': 'Sedan', 'Source': 'Trade-in' },
      { 'Report Date': '2025-05-13', 'Stock#': 'C345', 'VIN': '1FTEX1EM5EF123456', 'Make': 'Ford', 'Model': 'F-150', 'Price': 45600, 'Cost': 41200, 'Age': 8, 'Category': 'Truck', 'Source': 'Dealer Transfer' },
      { 'Report Date': '2025-05-13', 'Stock#': 'D456', 'VIN': '3GNFK16Z23G123456', 'Make': 'Chevrolet', 'Model': 'Tahoe', 'Price': 52300, 'Cost': 47800, 'Age': 30, 'Category': 'SUV', 'Source': 'Auction' },
      { 'Report Date': '2025-05-13', 'Stock#': 'E567', 'VIN': '1N4AL3AP8DN123456', 'Make': 'Nissan', 'Model': 'Altima', 'Price': 26400, 'Cost': 23500, 'Age': 12, 'Category': 'Sedan', 'Source': 'Trade-in' }
    ]
  },
  DealerTrack: {
    records: [
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT123', 'Customer Name': 'Customer A', 'Vehicle': 'Honda Accord', 'Amount': 32500, 'Term': 60, 'Rate': 3.9, 'Product': 'Finance', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT234', 'Customer Name': 'Customer B', 'Vehicle': 'Toyota Camry', 'Amount': 29800, 'Term': 72, 'Rate': 4.2, 'Product': 'Lease', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT345', 'Customer Name': 'Customer C', 'Vehicle': 'Ford F-150', 'Amount': 45600, 'Term': 60, 'Rate': 3.5, 'Product': 'Finance', 'Type': 'Used' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT456', 'Customer Name': 'Customer D', 'Vehicle': 'Chevrolet Tahoe', 'Amount': 52300, 'Term': 48, 'Rate': 2.9, 'Product': 'Finance', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT567', 'Customer Name': 'Customer E', 'Vehicle': 'Nissan Altima', 'Amount': 26400, 'Term': 72, 'Rate': 4.5, 'Product': 'Lease', 'Type': 'New' }
    ]
  }
};

/**
 * Test the enhanced insight engine across different vendors
 */
async function testInsightEngineStability() {
  try {
    console.log('\n=== INSIGHT ENGINE STABILITY TEST ===\n');
    
    // Dynamically import the required modules
    const { generateEnhancedInsights, PROMPT_VERSION } = await import('./src/services/enhancedInsightGenerator.js');
    const insightDistribution = await import('./src/services/insightDistributionService.js');
    
    console.log(`Using prompt version: ${PROMPT_VERSION}\n`);
    
    // Create required directories
    const downloadsDir = path.join(__dirname, 'downloads');
    const resultsDir = path.join(__dirname, 'results');
    
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Get vendor from command line arguments, or test all
    const requestedVendor = process.argv[2];
    const vendors = requestedVendor ? [requestedVendor] : Object.keys(sampleVendorData);
    
    console.log(`Testing on vendors: ${vendors.join(', ')}`);
    
    const generatedInsights = [];
    
    // Test each vendor
    for (const vendor of vendors) {
      console.log(`\n--- Testing ${vendor} ---`);
      
      if (!sampleVendorData[vendor]) {
        console.error(`Unknown vendor: ${vendor}`);
        continue;
      }
      
      // Create a sample CSV file for this vendor
      const reportFile = await createSampleReportFile(vendor);
      console.log(`Created sample report file: ${reportFile}`);
      
      try {
        // Generate enhanced insights
        console.log('Generating enhanced insights with quality scoring...');
        const options = {
          platform: vendor,
          includeBusinessImpact: true,
          includeQualityScoring: true,
          includeTrendAnalysis: false,
          promptVersion: PROMPT_VERSION,
          userId: 'test',
          saveToDisk: true
        };
        
        const insights = await generateEnhancedInsights(reportFile, options);
        
        // Log quality scores
        if (insights.qualityScores) {
          console.log('\nQuality Scores:');
          console.log(`Overall: ${insights.qualityScores.overall.toFixed(2)}`);
          
          if (insights.qualityScores.dimensions) {
            for (const [dimension, score] of Object.entries(insights.qualityScores.dimensions)) {
              console.log(`${dimension}: ${score.toFixed(2)}`);
            }
          }
        }
        
        // Log business impact
        if (insights.businessImpact && insights.businessImpact.overallImpact) {
          console.log('\nBusiness Impact:');
          console.log(`Overall: ${insights.businessImpact.overallImpact.impactLevel} (${insights.businessImpact.overallImpact.score.toFixed(1)}/10)`);
          
          if (insights.businessImpact.revenueImpact) {
            console.log(`Revenue Impact: $${insights.businessImpact.revenueImpact.total.toLocaleString()} (${insights.businessImpact.revenueImpact.confidence} confidence)`);
          }
          
          if (insights.businessImpact.costSavings) {
            console.log(`Cost Savings: $${insights.businessImpact.costSavings.total.toLocaleString()} (${insights.businessImpact.costSavings.confidence} confidence)`);
          }
        }
        
        // Extract opportunities
        if (insights.opportunities && Array.isArray(insights.opportunities)) {
          console.log('\nKey Opportunities:');
          for (let i = 0; i < Math.min(2, insights.opportunities.length); i++) {
            const opportunity = insights.opportunities[i];
            console.log(`${i+1}. ${opportunity.title}`);
            console.log(`   ${opportunity.description}`);
            if (opportunity.actionSteps && Array.isArray(opportunity.actionSteps)) {
              console.log('   Action Steps:');
              for (const step of opportunity.actionSteps.slice(0, 2)) {
                console.log(`   - ${step}`);
              }
              if (opportunity.actionSteps.length > 2) {
                console.log(`   - Plus ${opportunity.actionSteps.length - 2} more steps...`);
              }
            }
          }
          
          if (insights.opportunities.length > 2) {
            console.log(`   Plus ${insights.opportunities.length - 2} more opportunities...`);
          }
        }
        
        generatedInsights.push({
          vendor,
          insightId: insights.metadata?.insightId,
          qualityScore: insights.qualityScores?.overall || 0,
          businessImpact: insights.businessImpact?.overallImpact?.score || 0
        });
        
        // Test distribution
        if (insights.metadata?.insightId) {
          console.log('\nTesting insight distribution...');
          
          const distributionResult = await insightDistribution.distributeInsights(
            insights.metadata.insightId,
            {
              specificRoles: ['executive', 'sales'],
              sendEmails: false
            }
          );
          
          console.log(`Would distribute to ${distributionResult.distributionsCreated} recipients`);
        }
      } catch (error) {
        console.error(`Error testing ${vendor}:`, error);
      }
    }
    
    // Show summary
    console.log('\n=== TEST SUMMARY ===');
    
    if (generatedInsights.length > 0) {
      console.log('\nGenerated Insights:');
      for (const item of generatedInsights) {
        console.log(`${item.vendor}: Quality=${item.qualityScore.toFixed(2)}, Impact=${item.businessImpact.toFixed(1)}/10`);
      }
      
      console.log('\nTest completed successfully!');
    } else {
      console.log('No insights were generated during the test.');
    }
  } catch (error) {
    console.error('Error in stability test:', error);
  }
}

/**
 * Create a sample report file for a vendor
 */
async function createSampleReportFile(vendor) {
  try {
    // Create downloads directory if it doesn't exist
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Generate a unique ID for this report
    const reportId = uuidv4();
    
    // Create CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${vendor}_sample_report_${timestamp}.csv`;
    const filePath = path.join(downloadsDir, fileName);
    
    // Get sample data for this vendor
    const data = sampleVendorData[vendor];
    
    if (!data || !data.records || data.records.length === 0) {
      throw new Error(`No sample data available for vendor: ${vendor}`);
    }
    
    // Extract headers from first record
    const headers = Object.keys(data.records[0]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    // Add rows
    for (const record of data.records) {
      const row = headers.map(header => {
        const value = record[header];
        
        // Format value based on type
        if (typeof value === 'string') {
          // Quote strings and escape any embedded quotes
          return `"${value.replace(/"/g, '""')}"`;
        } else {
          return value;
        }
      }).join(',');
      
      csvContent += row + '\n';
    }
    
    // Write to file
    fs.writeFileSync(filePath, csvContent);
    
    return filePath;
  } catch (error) {
    console.error('Error creating sample report file:', error);
    throw error;
  }
}

// Run the test
testInsightEngineStability();