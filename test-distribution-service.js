/**
 * Test script for the Insight Distribution Service
 * 
 * This script demonstrates how the distribution service adapts and delivers
 * insights to different stakeholders based on their roles and preferences.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  distributeInsights,
  scheduleDistribution 
} from './src/services/insightDistributionService.js';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample insights for testing
const sampleInsights = {
  metadata: {
    timestamp: new Date().toISOString(),
    platform: 'VinSolutions',
    recordCount: 36,
    generatedWith: 'enhanced-insight-generator-v2.0.0'
  },
  insights: {
    summary: "The dealership achieved a total sales value of $1,328,806.41 across 33 deals in April 2024, with an average gross profit of $2,905.06 per vehicle.",
    value_insights: [
      "Hunter Adams led in sales with 10 vehicles sold, contributing significantly to the dealership's performance.",
      "The Acura MDX and RDX were the top-selling models, each accounting for 10 sales, indicating strong customer preference for these models."
    ],
    actionable_flags: [
      "Increase focus on promoting the Acura MDX and RDX models to capitalize on their popularity.",
      "Enhance training and support for sales representatives to improve average gross profit, especially for reps with lower performance."
    ],
    key_metrics: {
      dealCount: 33,
      totalSales: 1328806.41,
      avgSalesPrice: 40266.86,
      totalGross: 95866.88,
      avgGross: 2905.06
    },
    risk_areas: [
      {
        risk: "Some deals resulted in negative or low gross profits, indicating potential pricing or cost issues.",
        mitigation: "Review pricing strategies and cost structures to ensure profitability across all deals."
      }
    ],
    confidence: "high"
  }
};

// Sample stakeholders for testing - using just one for the test to avoid timeout
const sampleStakeholders = [
  {
    id: 'user-123',
    name: 'John Smith',
    role: 'EXECUTIVE',
    email: 'john.smith@dealership.com',
    distributionMethod: 'EMAIL'
  }
];

// Sample schedule for testing
const sampleSchedule = {
  frequency: 'WEEKLY',
  dayOfWeek: 'MONDAY',
  time: '09:00',
  timezone: 'America/New_York'
};

/**
 * Test the insight distribution service
 */
async function testDistributionService() {
  try {
    console.log("=== Testing Insight Distribution Service ===");
    
    // Test 1: Distribute insights to stakeholders
    console.log("\n=== Test 1: Distribute Insights ===");
    const distributionResults = await distributeInsights(sampleInsights, sampleStakeholders);
    console.log(`Distribution Results Summary:
- Successful: ${distributionResults.successful.length}
- Failed: ${distributionResults.failed.length}
- Skipped: ${distributionResults.skipped.length}`);
    
    // Test 2: Schedule regular distribution
    console.log("\n=== Test 2: Schedule Distribution ===");
    const scheduleResults = await scheduleDistribution(
      'Dealership Performance Report',
      sampleStakeholders,
      sampleSchedule,
      { defaultMethod: 'EMAIL' }
    );
    console.log(`Schedule Configuration:
- ID: ${scheduleResults.id}
- Type: ${scheduleResults.insightType}
- Frequency: ${scheduleResults.schedule.frequency}
- Day of Week: ${scheduleResults.schedule.dayOfWeek}
- Time: ${scheduleResults.schedule.time}
- Stakeholders: ${scheduleResults.stakeholders.length}
- Status: ${scheduleResults.status}`);
    
    console.log("\n=== Distribution Service Test Complete ===");
  } catch (error) {
    console.error("Error testing distribution service:", error);
  }
}

// Run the test
testDistributionService();