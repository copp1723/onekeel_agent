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

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Set sample data flag for testing
process.env.USE_SAMPLE_DATA = 'true';

// Define constants
const PROMPT_VERSION = "1.0.0";
const RESULTS_DIR = './results';
const PLATFORM = 'VinSolutions';
const QUALITY_THRESHOLD = 0.7;

/**
 * Main test function
 */
async function testInsightEngineStability() {
  console.log('\n=== INSIGHT ENGINE STABILITY TEST ===\n');
  
  try {
    // Get CSV file path from command line or use a default
    let csvFilePath = process.argv[2];
    
    if (!csvFilePath || !fs.existsSync(csvFilePath)) {
      console.log('No valid CSV file provided, creating a sample file...');
      csvFilePath = await createSampleCsvFile();
    }
    
    console.log(`Using CSV file: ${csvFilePath}`);
    
    // Read and parse the CSV data
    console.log('\n--- Step 1: Parsing CSV Data ---');
    const startTime = Date.now();
    const records = parseCSVData(csvFilePath);
    const parseTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Parsed ${records.length} records in ${parseTime}s`);
    
    // Generate insights with version tracking and metadata
    console.log('\n--- Step 2: Generating Insights ---');
    const insightsStart = Date.now();
    const insights = await generateInsightsWithVersioning(records, PLATFORM);
    const insightsTime = ((Date.now() - insightsStart) / 1000).toFixed(2);
    console.log(`✓ Insights generated in ${insightsTime}s`);
    
    // Save insights with metadata
    console.log('\n--- Step 3: Saving Results with Metadata ---');
    const resultsPath = saveInsightsWithMetadata(insights, PLATFORM);
    console.log(`✓ Results saved to ${resultsPath}`);
    
    // Perform quality scoring
    console.log('\n--- Step 4: Quality Scoring ---');
    const qualityScore = scoreInsightQuality(insights);
    console.log(`✓ Quality score: ${qualityScore.overall.toFixed(2)} (Threshold: ${QUALITY_THRESHOLD})`);
    
    if (qualityScore.overall < QUALITY_THRESHOLD) {
      console.warn(`⚠️ Quality score below threshold (${QUALITY_THRESHOLD})`);
    } else {
      console.log(`✓ Quality score above threshold (${QUALITY_THRESHOLD})`);
    }
    
    // Display quality breakdown
    console.log('\nQuality breakdown:');
    Object.entries(qualityScore.dimensions).forEach(([dimension, score]) => {
      console.log(`  ${dimension}: ${score.toFixed(2)}`);
    });
    
    // Display a summary of the insights
    console.log('\n=== INSIGHTS SUMMARY ===');
    console.log(insights.summary);
    console.log('\nTop opportunities:');
    insights.opportunities.forEach((opportunity, index) => {
      console.log(`  ${index + 1}. ${opportunity}`);
    });
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n=== TEST COMPLETED SUCCESSFULLY IN ${totalTime}s ===`);
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Parse CSV data from file
 */
function parseCSVData(filePath) {
  const csvData = fs.readFileSync(filePath, 'utf8');
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const record = {};
    
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j];
    }
    
    records.push(record);
  }
  
  return records;
}

/**
 * Generate insights with version tracking
 */
async function generateInsightsWithVersioning(data, platform) {
  console.log(`Generating insights for ${platform} with prompt version ${PROMPT_VERSION}`);
  
  // Log metadata about this insight run
  const runMetadata = {
    timestamp: new Date().toISOString(),
    platform,
    promptVersion: PROMPT_VERSION,
    recordCount: data.length,
    dataSummary: {
      dateRange: extractDateRange(data),
      sourceCount: countSourceDistribution(data),
      vehicleCount: countVehicleDistribution(data)
    }
  };
  
  console.log(`Run metadata: ${JSON.stringify(runMetadata, null, 2)}`);
  
  // In a real implementation, this would call the OpenAI API with the automotive analysis prompt
  // For testing, we'll return simulated insights
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
  
  // The insights object with added metadata
  return {
    summary: "Strong performance with SUVs and trucks, increasing customer interest from website leads.",
    leadSources: {
      topSource: "Website",
      performance: "Website leads are up 15% and converting at a higher rate than last month."
    },
    inventoryHealth: {
      fastestMoving: "Ford F-150",
      slowestMoving: "Chevrolet Tahoe",
      daysOnLotAverage: 18,
      recommendation: "Consider adjusting pricing on Tahoe models to improve turn rate."
    },
    salesPerformance: {
      topPerformer: "Rep 1",
      improvement: "Rep 3 showing significant improvement in lead conversion (+22%)."
    },
    opportunities: [
      "Increase SUV inventory based on current demand trends",
      "Follow up on Honda negotiations which have high close probability",
      "Schedule targeted training for reps handling website leads"
    ],
    metadata: runMetadata
  };
}

/**
 * Extract date range from data
 */
function extractDateRange(data) {
  if (!data || data.length === 0 || !data[0].Date) {
    return { min: null, max: null };
  }
  
  let minDate = data[0].Date;
  let maxDate = data[0].Date;
  
  data.forEach(record => {
    if (record.Date < minDate) minDate = record.Date;
    if (record.Date > maxDate) maxDate = record.Date;
  });
  
  return { min: minDate, max: maxDate };
}

/**
 * Count source distribution
 */
function countSourceDistribution(data) {
  const sources = {};
  
  data.forEach(record => {
    if (record.LeadSource) {
      sources[record.LeadSource] = (sources[record.LeadSource] || 0) + 1;
    }
  });
  
  return sources;
}

/**
 * Count vehicle distribution
 */
function countVehicleDistribution(data) {
  const vehicles = {};
  
  data.forEach(record => {
    if (record.Vehicle) {
      vehicles[record.Vehicle] = (vehicles[record.Vehicle] || 0) + 1;
    }
  });
  
  return vehicles;
}

/**
 * Save insights with metadata to structured directory
 */
function saveInsightsWithMetadata(insights, platform) {
  // Create structured directory path
  const date = new Date().toISOString().split('T')[0];
  const platformDir = path.join(RESULTS_DIR, platform);
  const dateDir = path.join(platformDir, date);
  
  // Create directories if they don't exist
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true });
  }
  if (!fs.existsSync(dateDir)) {
    fs.mkdirSync(dateDir, { recursive: true });
  }
  
  // Generate a unique filename with timestamp and version
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `insights_v${PROMPT_VERSION}_${timestamp}.json`;
  const filePath = path.join(dateDir, filename);
  
  // Add quality score to the insights
  insights.qualityScore = scoreInsightQuality(insights);
  
  // Save the insights as JSON
  fs.writeFileSync(filePath, JSON.stringify(insights, null, 2), 'utf8');
  
  return filePath;
}

/**
 * Score the quality of the insights
 */
function scoreInsightQuality(insights) {
  // Define scoring dimensions
  const dimensions = {
    completeness: scoreCompleteness(insights),
    relevance: scoreRelevance(insights),
    specificity: scoreSpecificity(insights),
    coherence: scoreCoherence(insights),
    innovation: scoreInnovation(insights)
  };
  
  // Calculate overall score (weighted average)
  const weights = {
    completeness: 0.25,
    relevance: 0.25,
    specificity: 0.2,
    coherence: 0.15,
    innovation: 0.15
  };
  
  let overallScore = 0;
  Object.entries(dimensions).forEach(([dimension, score]) => {
    overallScore += score * weights[dimension];
  });
  
  return {
    overall: overallScore,
    dimensions
  };
}

/**
 * Score the completeness of insights
 */
function scoreCompleteness(insights) {
  let score = 0;
  
  // Check for required sections
  if (insights.summary) score += 0.2;
  if (insights.leadSources) score += 0.2;
  if (insights.inventoryHealth) score += 0.2;
  if (insights.salesPerformance) score += 0.2;
  if (insights.opportunities && insights.opportunities.length > 0) score += 0.2;
  
  return score;
}

/**
 * Score the relevance of insights
 */
function scoreRelevance(insights) {
  // In a real implementation, this would analyze whether the insights
  // are relevant to the provided data and platform
  return 0.85; // Simulated score
}

/**
 * Score the specificity of insights
 */
function scoreSpecificity(insights) {
  // Check for specific, concrete information rather than generalities
  let score = 0;
  
  // Check specificity in inventory health
  if (insights.inventoryHealth) {
    if (insights.inventoryHealth.fastestMoving) score += 0.1;
    if (insights.inventoryHealth.slowestMoving) score += 0.1;
    if (typeof insights.inventoryHealth.daysOnLotAverage === 'number') score += 0.1;
    if (insights.inventoryHealth.recommendation 
        && insights.inventoryHealth.recommendation.length > 20) score += 0.1;
  }
  
  // Check specificity in sales performance
  if (insights.salesPerformance) {
    if (insights.salesPerformance.topPerformer) score += 0.1;
    if (insights.salesPerformance.improvement 
        && insights.salesPerformance.improvement.includes('%')) score += 0.1;
  }
  
  // Check specificity in lead sources
  if (insights.leadSources && insights.leadSources.topSource) score += 0.1;
  
  // Check specificity in opportunities
  if (insights.opportunities) {
    const specificOpportunities = insights.opportunities.filter(
      opp => opp.length > 15 && /[0-9%$]/.test(opp)
    );
    score += Math.min(0.3, specificOpportunities.length * 0.1);
  }
  
  return score;
}

/**
 * Score the coherence of insights
 */
function scoreCoherence(insights) {
  // In a real implementation, this would check for logical consistency
  // between different parts of the insights
  return 0.9; // Simulated score
}

/**
 * Score the innovation of insights
 */
function scoreInnovation(insights) {
  // In a real implementation, this would look for novel or unexpected insights
  return 0.75; // Simulated score
}

/**
 * Create a sample CSV file for testing
 */
async function createSampleCsvFile() {
  const downloadDir = './downloads';
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  const fileName = `${PLATFORM}_sample_report_${Date.now()}.csv`;
  const filePath = path.join(downloadDir, fileName);
  
  const sampleData = `Date,Customer,Vehicle,Status,Price,LeadSource,SalesPerson,DaysOnLot
2025-05-13,Customer A,Toyota Camry SE,New Lead,$28500,Website,Rep 1,15
2025-05-13,Customer B,Honda Accord LX,Test Drive,$31200,Phone,Rep 2,22
2025-05-13,Customer C,Ford F-150 XLT,Negotiation,$42750,Walk-in,Rep 3,8
2025-05-13,Customer D,Chevrolet Tahoe LT,Purchased,$55300,Referral,Rep 1,30
2025-05-13,Customer E,Nissan Altima S,New Lead,$26400,Website,Rep 4,12
2025-05-13,Customer F,Hyundai Sonata,Test Drive,$25800,Website,Rep 2,20
2025-05-13,Customer G,Kia Sorento,Negotiation,$33900,Phone,Rep 5,25
2025-05-13,Customer H,Ford Escape,Purchased,$29700,Walk-in,Rep 1,18
2025-05-13,Customer I,Mazda CX-5,New Lead,$31500,Website,Rep 3,5
2025-05-13,Customer J,Subaru Outback,Test Drive,$34900,Referral,Rep 4,15`;
  
  fs.writeFileSync(filePath, sampleData);
  console.log(`Created sample CSV file at ${filePath}`);
  
  return filePath;
}

// Run the test
testInsightEngineStability().catch(console.error);