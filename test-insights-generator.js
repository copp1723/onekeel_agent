/**
 * Test script for the Automotive Insights Generator
 * This script demonstrates the integration of the automotive analyst prompt
 * with the insight generation pipeline.
 * 
 * To test:
 * 1. Ensure OPENAI_API_KEY is set in your environment
 * 2. Provide a sample CRM CSV file path as argument
 * 
 * Usage: node test-insights-generator.js <csv-file-path>
 * Example: node test-insights-generator.js ./downloads/VinSolutions_report.csv
 */

import { generateInsightsFromCSV, generateInsightsFromCSVContent } from './dist/agents/generateInsightsFromCSV.js';
import { getAvailableIntents } from './dist/prompts/promptRouter.js';
import fs from 'fs';

// Sample CSV data for testing when no file is provided
const SAMPLE_CSV = `
Customer,Email,Phone,Vehicle,Make,Model,Year,Status,SalesRep,LastContact,DaysInPipeline
John Smith,jsmith@example.com,555-1234,SUV,Toyota,RAV4,2023,Lead,Mike Johnson,2023-04-15,45
Jane Doe,jdoe@example.com,555-5678,Sedan,Honda,Accord,2022,Purchase,Sarah Wilson,2023-05-02,12
Robert Brown,rbrown@example.com,555-9012,Truck,Ford,F-150,2023,Test Drive,Mike Johnson,2023-04-28,30
Mary Williams,mwilliams@example.com,555-3456,SUV,Jeep,Cherokee,2022,Negotiation,David Garcia,2023-05-01,15
James Miller,jmiller@example.com,555-7890,Sedan,Toyota,Camry,2023,Lead,Sarah Wilson,2023-04-10,50
`.trim();

async function testInsightGenerator() {
  console.log('🔍 AUTOMOTIVE INSIGHT GENERATOR TEST');
  console.log('======================================');
  
  // Check if OpenAI API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set.');
    console.error('Please set this environment variable to run the test.');
    process.exit(1);
  }
  
  // Get available prompt intents
  const availableIntents = getAvailableIntents();
  console.log(`Available prompt intents: ${availableIntents.join(', ')}`);
  console.log('--------------------------------------');
  
  try {
    // Get file path from command line args or use sample data
    const filePath = process.argv[2];
    
    if (filePath && fs.existsSync(filePath)) {
      // Test with file if provided
      console.log(`Using CSV file: ${filePath}`);
      const startTime = Date.now();
      
      const insights = await generateInsightsFromCSV(filePath);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Insights generated in ${duration}s`);
      console.log('--------------------------------------');
      console.log(`Title: ${insights.title}`);
      console.log('\nDescription:');
      console.log(insights.description);
      console.log('\nAction Items:');
      insights.actionItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item}`);
      });
      
      if (insights.dataPoints) {
        console.log('\nData Points:');
        for (const [key, value] of Object.entries(insights.dataPoints)) {
          console.log(`- ${key}: ${value}`);
        }
      }
    } else {
      // Test with sample data
      console.log('No file provided or file not found. Using sample CSV data.');
      console.log('Sample data:');
      console.log('--------------------------------------');
      console.log(SAMPLE_CSV);
      console.log('--------------------------------------');
      
      const startTime = Date.now();
      
      const insights = await generateInsightsFromCSVContent(SAMPLE_CSV);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Insights generated in ${duration}s`);
      console.log('--------------------------------------');
      console.log(`Title: ${insights.title}`);
      console.log('\nDescription:');
      console.log(insights.description);
      console.log('\nAction Items:');
      insights.actionItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item}`);
      });
      
      if (insights.dataPoints) {
        console.log('\nData Points:');
        for (const [key, value] of Object.entries(insights.dataPoints)) {
          console.log(`- ${key}: ${value}`);
        }
      }
    }
    
    console.log('\n======================================');
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error generating insights:');
    console.error(error);
  }
}

// Run the test
testInsightGenerator().catch(console.error);