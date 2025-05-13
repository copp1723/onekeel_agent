/**
 * Test Script for Prompt Analysis with Sample Data
 * 
 * This script tests our enhanced prompts against real dealership data.
 * It runs analyses using each of our specialized prompts and logs the results.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import OpenAI from 'openai';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Path to the prompts directory
const promptsDir = path.join(__dirname, 'src', 'prompts');

// The CSV data file
const dataFile = path.join(__dirname, 'downloads', 'sample_dealership_data.csv');

// Function to load a prompt from file
async function loadPrompt(promptFile) {
  try {
    const promptPath = path.join(promptsDir, promptFile);
    const promptData = await fs.promises.readFile(promptPath, 'utf-8');
    return JSON.parse(promptData);
  } catch (error) {
    console.error(`Error loading prompt ${promptFile}:`, error.message);
    throw error;
  }
}

// Function to parse CSV data
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Function to analyze data with a specific prompt
async function analyzeWithPrompt(promptFile, data) {
  console.log(`\n=== Analyzing with ${promptFile} ===\n`);
  
  try {
    // Load the prompt
    const prompt = await loadPrompt(promptFile);
    
    // Prepare data for analysis
    const dataStr = JSON.stringify(data, null, 2);
    
    // Prepare messages for the API call
    const messages = [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user + "\n\n" + dataStr }
    ];
    
    // Call the OpenAI API
    console.log(`Calling OpenAI API with prompt version: ${prompt.version}`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.5,
      max_tokens: 1000
    });
    
    // Get and parse the response
    const result = response.choices[0].message.content;
    
    // Try to parse the result as JSON
    try {
      const parsedResult = JSON.parse(result);
      console.log(JSON.stringify(parsedResult, null, 2));
      return parsedResult;
    } catch (parseError) {
      // If not valid JSON, return the raw text
      console.log(result);
      return result;
    }
  } catch (error) {
    console.error(`Error analyzing with ${promptFile}:`, error.message);
    return null;
  }
}

// Function to summarize basic statistics
function summarizeDataStats(data) {
  // Count deals by type
  const modelCounts = {};
  const salesRepCounts = {};
  const leadSourceCounts = {};
  let totalGross = 0;
  let totalSales = 0;
  let dealCount = 0;
  
  // Calculate statistics
  data.forEach(deal => {
    if (deal.VehicleModel) {
      modelCounts[deal.VehicleModel] = (modelCounts[deal.VehicleModel] || 0) + 1;
    }
    
    if (deal.SalesRepName) {
      salesRepCounts[deal.SalesRepName] = (salesRepCounts[deal.SalesRepName] || 0) + 1;
    }
    
    if (deal.LeadSource) {
      const source = deal['LeadSource Category'] || deal.LeadSource;
      leadSourceCounts[source] = (leadSourceCounts[source] || 0) + 1;
    }
    
    // Convert price strings to numbers
    if (deal.SellingPrice && !isNaN(Number(deal.SellingPrice))) {
      totalSales += Number(deal.SellingPrice);
      dealCount++;
    }
    
    if (deal['Total Gross']) {
      const grossStr = deal['Total Gross'].replace(/[$,]/g, '');
      if (!isNaN(Number(grossStr))) {
        totalGross += Number(grossStr);
      }
    }
  });
  
  // Generate summary statistics object for use in analysis
  return {
    dealCount,
    totalSales,
    avgSalesPrice: totalSales / dealCount,
    totalGross,
    avgGross: totalGross / dealCount,
    topModels: Object.entries(modelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topSalesReps: Object.entries(salesRepCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    leadSources: Object.entries(leadSourceCounts).sort((a, b) => b[1] - a[1])
  };
}

// Main function to run the analysis
async function main() {
  try {
    console.log("=== Prompt Analysis Test ===");
    
    // Load and parse the data
    console.log("Loading and parsing data...");
    const rawData = await parseCSV(dataFile);
    console.log(`Loaded ${rawData.length} records.`);
    
    // Calculate basic statistics
    console.log("Calculating basic statistics...");
    const stats = summarizeDataStats(rawData);
    console.log("Basic statistics calculated.");
    
    // Define the prompts to test - we'll just use one to avoid timeout
    const prompts = [
      'automotive-analyst.json'
      // 'business-impact.json',
      // 'visualization-enhanced.json',
      // 'tone-adaptive.json'
    ];
    
    // Add the data summary to the raw data for enhanced context
    const enrichedData = {
      deals: rawData,
      summary: stats
    };
    
    // Run the analysis for each prompt
    for (const promptFile of prompts) {
      await analyzeWithPrompt(promptFile, enrichedData);
    }
    
    console.log("\n=== Analysis Complete ===");
  } catch (error) {
    console.error("Error running analysis:", error);
  }
}

// Run the main function
main();