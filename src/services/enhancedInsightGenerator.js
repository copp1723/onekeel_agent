/**
 * Enhanced Insight Generator Service
 * 
 * This service takes CRM report data and generates high-quality, 
 * actionable insights with business impact scoring and quality metrics.
 * It uses version-controlled prompts and tracks insight quality.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

// Current prompt version (follows semver)
const PROMPT_VERSION = "2.0.0";

// Directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPT_DIR = path.join(__dirname, '..', 'prompts');
const RESULTS_DIR = path.join(process.cwd(), 'results');

/**
 * Generate enhanced insights from report data
 * 
 * @param {string|Object} reportData - The report data (file path or parsed data)
 * @param {Object} options - Options for insight generation
 * @returns {Promise<Object>} - Generated insights with metadata
 */
export async function generateEnhancedInsights(reportData, options = {}) {
  try {
    console.log('Generating enhanced insights...');
    
    // Default options
    const config = {
      platform: options.platform || 'Unknown',
      includeBusinessImpact: options.includeBusinessImpact !== false,
      includeQualityScoring: options.includeQualityScoring !== false,
      includeTrendAnalysis: Boolean(options.includeTrendAnalysis),
      promptVersion: options.promptVersion || PROMPT_VERSION,
      userId: options.userId || 'system',
      saveToDisk: options.saveToDisk !== false
    };
    
    // Create required directories
    await ensureDirectoriesExist(config.platform);
    
    // Check if using sample data
    if (process.env.USE_SAMPLE_DATA === 'true' && !reportData) {
      console.log('Using sample data for testing...');
      // Generate sample data based on platform
      reportData = generateSampleReportData(config.platform);
    }
    
    // Load report data from file if a string path is provided
    let data = reportData;
    if (typeof reportData === 'string' && fs.existsSync(reportData)) {
      data = await loadReportDataFromFile(reportData);
    }
    
    // Generate initial insights
    const initialInsights = await generateInitialInsights(data, config);
    
    // Enrich with business impact if requested
    if (config.includeBusinessImpact) {
      initialInsights.businessImpact = await generateBusinessImpactScoring(initialInsights, config);
    }
    
    // Add quality scoring if requested
    if (config.includeQualityScoring) {
      initialInsights.qualityScores = await evaluateInsightQuality(initialInsights, config);
    }
    
    // Add trend analysis if requested
    if (config.includeTrendAnalysis) {
      initialInsights.trendAnalysis = await generateTrendAnalysis(data, config);
    }
    
    // Save insights to disk if requested
    if (config.saveToDisk) {
      await saveInsightsToDisk(initialInsights, config);
    }
    
    return initialInsights;
  } catch (error) {
    console.error('Error generating enhanced insights:', error);
    throw error;
  }
}

/**
 * Load report data from a file
 */
async function loadReportDataFromFile(filePath) {
  try {
    // Determine file type from extension
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      // Parse JSON file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    } else if (ext === '.csv') {
      // For CSV files, read as text for now
      // In a full implementation, you'd use the csv-parse package to convert to objects
      return {
        type: 'csv',
        filePath,
        content: fs.readFileSync(filePath, 'utf8')
      };
    } else {
      // For other file types, just return the path
      return {
        type: 'unknown',
        filePath
      };
    }
  } catch (error) {
    console.error('Error loading report data from file:', error);
    throw error;
  }
}

/**
 * Generate initial insights using the automotive analyst prompt
 */
async function generateInitialInsights(data, config) {
  try {
    // Load automotive analyst prompt
    const prompt = await loadPrompt('automotive-analyst', config.promptVersion);
    
    // Prepare data for the prompt
    const dataForPrompt = prepareDataForPrompt(data, config.platform);
    
    // Create system and user messages
    const systemMessage = prompt.system;
    const userMessage = `${prompt.user}\n\nCRM Platform: ${config.platform}\n\nReport Data:\n${JSON.stringify(dataForPrompt, null, 2)}`;
    
    console.log(`Calling OpenAI API with ${OPENAI_MODEL} model and ${config.promptVersion} prompt version...`);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    
    // Parse the response
    const insightContent = JSON.parse(response.choices[0].message.content);
    
    // Add metadata
    const insightWithMetadata = {
      ...insightContent,
      metadata: {
        timestamp: new Date().toISOString(),
        platform: config.platform,
        promptVersion: config.promptVersion,
        userId: config.userId,
        insightId: uuidv4(),
        recordCount: Array.isArray(data) ? data.length : (data?.records?.length || 0),
        generationModel: OPENAI_MODEL
      }
    };
    
    return insightWithMetadata;
  } catch (error) {
    console.error('Error generating initial insights:', error);
    
    // Fall back to sample insights with error info
    return {
      summary: "Error generating insights. Please check logs for details.",
      keyPerformanceIndicators: {},
      opportunities: [],
      riskAreas: [],
      error: error.message,
      metadata: {
        timestamp: new Date().toISOString(),
        platform: config.platform,
        promptVersion: config.promptVersion,
        userId: config.userId,
        insightId: uuidv4(),
        generationModel: OPENAI_MODEL
      }
    };
  }
}

/**
 * Generate business impact scoring for the insights
 */
async function generateBusinessImpactScoring(insights, config) {
  try {
    // Load business impact prompt
    const prompt = await loadPrompt('business-impact', config.promptVersion);
    
    // Create system and user messages
    const systemMessage = prompt.system;
    const userMessage = `${prompt.user}\n\nInsights:\n${JSON.stringify({
      summary: insights.summary,
      keyPerformanceIndicators: insights.keyPerformanceIndicators,
      opportunities: insights.opportunities,
      riskAreas: insights.riskAreas,
      strategicRecommendations: insights.strategicRecommendations
    }, null, 2)}`;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5
    });
    
    // Parse the response
    const businessImpact = JSON.parse(response.choices[0].message.content);
    
    return businessImpact;
  } catch (error) {
    console.error('Error generating business impact scoring:', error);
    
    // Return basic business impact structure in case of error
    return {
      revenueImpact: {
        total: 0,
        confidence: "low",
        details: [],
        timeframe: "unknown"
      },
      costSavings: {
        total: 0,
        confidence: "low",
        details: [],
        timeframe: "unknown"
      },
      customerImpact: {
        score: 0,
        impactLevel: "unknown",
        impactAreas: []
      },
      urgencyFactors: {
        overallUrgency: "unknown"
      },
      effortRequired: {
        overallEffort: "unknown"
      },
      overallImpact: {
        score: 0,
        impactLevel: "unknown"
      },
      error: error.message
    };
  }
}

/**
 * Evaluate the quality of generated insights
 */
async function evaluateInsightQuality(insights, config) {
  try {
    // Load quality evaluation prompt
    const prompt = await loadPrompt('quality-evaluation', config.promptVersion);
    
    // Create system and user messages
    const systemMessage = prompt.system;
    const userMessage = `${prompt.user}\n\nInsights to evaluate:\n${JSON.stringify({
      summary: insights.summary,
      keyPerformanceIndicators: insights.keyPerformanceIndicators,
      opportunities: insights.opportunities,
      riskAreas: insights.riskAreas,
      strategicRecommendations: insights.strategicRecommendations
    }, null, 2)}`;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    
    // Parse the response
    const qualityScores = JSON.parse(response.choices[0].message.content);
    
    return qualityScores;
  } catch (error) {
    console.error('Error evaluating insight quality:', error);
    
    // Return basic quality scores in case of error
    return {
      overall: 0.5,
      dimensions: {
        completeness: 0.5,
        relevance: 0.5,
        specificity: 0.5,
        coherence: 0.5,
        innovation: 0.5
      },
      error: error.message
    };
  }
}

/**
 * Generate trend analysis by comparing with historical data
 */
async function generateTrendAnalysis(currentData, config) {
  try {
    // In a real implementation, this would fetch historical data
    // from a database and perform actual trend analysis
    
    // For demonstration, return a simple trend structure
    return {
      comparisonPeriod: "previous_month",
      trends: {
        sales: {
          direction: "increasing",
          percentChange: 5.2,
          significance: "medium"
        },
        leads: {
          direction: "increasing",
          percentChange: 8.7,
          significance: "high"
        },
        conversion: {
          direction: "stable",
          percentChange: 0.3,
          significance: "low"
        },
        inventory: {
          direction: "decreasing",
          percentChange: -3.1,
          significance: "medium"
        }
      },
      historicalData: {
        periods: ["Jan", "Feb", "Mar", "Apr", "May"],
        metrics: {
          sales: [125, 130, 128, 135, 142],
          leads: [230, 245, 240, 255, 277],
          conversion: [0.22, 0.23, 0.22, 0.22, 0.225]
        }
      },
      projections: {
        nextMonth: {
          sales: {
            expected: 149,
            lowRange: 143,
            highRange: 155
          },
          leads: {
            expected: 290,
            lowRange: 280,
            highRange: 300
          }
        }
      }
    };
  } catch (error) {
    console.error('Error generating trend analysis:', error);
    return {
      error: error.message,
      comparisonPeriod: "unknown",
      trends: {}
    };
  }
}

/**
 * Save generated insights to disk
 */
async function saveInsightsToDisk(insights, config) {
  try {
    // Create vendor directory if it doesn't exist
    const vendorDir = path.join(RESULTS_DIR, config.platform);
    if (!fs.existsSync(vendorDir)) {
      fs.mkdirSync(vendorDir, { recursive: true });
    }
    
    // Create date directory for organization
    const today = new Date().toISOString().split('T')[0];
    const dateDir = path.join(vendorDir, today);
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }
    
    // Create filename with timestamp and prompt version
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = `insights_v${config.promptVersion}_${timestamp}.json`;
    const filePath = path.join(dateDir, fileName);
    
    // Write insights to file
    fs.writeFileSync(filePath, JSON.stringify(insights, null, 2));
    
    console.log(`Insights saved to ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('Error saving insights to disk:', error);
    throw error;
  }
}

/**
 * Ensure all required directories exist
 */
async function ensureDirectoriesExist(platform) {
  try {
    // Create results directory if it doesn't exist
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    
    // Create vendor directory if it doesn't exist
    const vendorDir = path.join(RESULTS_DIR, platform);
    if (!fs.existsSync(vendorDir)) {
      fs.mkdirSync(vendorDir, { recursive: true });
    }
    
    // Create prompts directory if it doesn't exist
    if (!fs.existsSync(PROMPT_DIR)) {
      fs.mkdirSync(PROMPT_DIR, { recursive: true });
      
      // Initialize with default prompts
      initializeDefaultPrompts();
    }
  } catch (error) {
    console.error('Error ensuring directories exist:', error);
    throw error;
  }
}

/**
 * Initialize default prompts if none exist
 */
function initializeDefaultPrompts() {
  try {
    // Create automotive analyst prompt
    const automotiveAnalystPrompt = {
      version: PROMPT_VERSION,
      system: `You are a strategic automotive dealership analyst. Your task is to analyze CRM and DMS report data and generate actionable insights.
        
Focus on:
1. Key performance indicators and trends
2. Concrete opportunities with specific action steps
3. Risk areas with mitigation strategies
4. Strategic recommendations with clear business impact

Your analysis should be data-driven, specific, and focused on actionable business value.`,
      user: `Analyze the following automotive dealership report data and generate comprehensive insights.
        
Please provide a structured JSON output that includes:
1. A high-level summary
2. Key performance indicators with trends
3. Specific opportunities with action steps
4. Risk areas with mitigation strategies
5. Strategic recommendations

Focus on concrete, actionable insights with business impact. Be specific about numbers, percentages, and expected outcomes.`
    };
    
    // Create business impact prompt
    const businessImpactPrompt = {
      version: PROMPT_VERSION,
      system: `You are a financial impact analyst for automotive dealerships. Your role is to evaluate the business impact of identified opportunities and insights.
        
Your analysis should cover:
1. Potential revenue impact (with confidence levels)
2. Cost savings opportunities
3. Customer experience impact
4. Urgency factors
5. Implementation effort required
6. Overall business impact score (1-10)

Base your analysis on industry benchmarks and be specific about financial projections.`,
      user: `Analyze the following dealership insights and generate a comprehensive business impact assessment.
        
Please provide a structured JSON output with the following sections:
1. Revenue impact (with total, confidence level, and details)
2. Cost savings (with total, confidence level, and details)
3. Customer impact (score, level, and affected areas)
4. Urgency factors (competitive threats, time constraints, etc.)
5. Effort required (implementation timeframe, resources needed, etc.)
6. Overall impact scoring

Be specific with financial projections and provide clear justification for your impact assessments.`
    };
    
    // Create quality evaluation prompt
    const qualityEvaluationPrompt = {
      version: PROMPT_VERSION,
      system: `You are a quality evaluation system for automotive business insights. Your task is to evaluate the quality of generated insights across multiple dimensions.
        
Evaluate using these dimensions:
1. Completeness (0-1): How comprehensive is the analysis?
2. Relevance (0-1): How relevant is the analysis to automotive dealership operations?
3. Specificity (0-1): How specific and concrete are the recommendations?
4. Coherence (0-1): How well do the insights connect to form a coherent narrative?
5. Innovation (0-1): How innovative or novel are the insights and recommendations?

Provide an overall score and detailed dimension scores with brief justifications.`,
      user: `Evaluate the quality of the following automotive dealership insights.
        
Please provide a JSON response with:
1. An overall quality score (0-1)
2. Individual dimension scores (0-1) for:
   - Completeness
   - Relevance
   - Specificity
   - Coherence
   - Innovation
3. Brief comments for each dimension

Be objective and provide specific examples to justify your ratings.`
    };
    
    // Save default prompts to files
    fs.writeFileSync(
      path.join(PROMPT_DIR, 'automotive-analyst.json'),
      JSON.stringify(automotiveAnalystPrompt, null, 2)
    );
    
    fs.writeFileSync(
      path.join(PROMPT_DIR, 'business-impact.json'),
      JSON.stringify(businessImpactPrompt, null, 2)
    );
    
    fs.writeFileSync(
      path.join(PROMPT_DIR, 'quality-evaluation.json'),
      JSON.stringify(qualityEvaluationPrompt, null, 2)
    );
    
    console.log('Default prompts initialized');
  } catch (error) {
    console.error('Error initializing default prompts:', error);
    throw error;
  }
}

/**
 * Load a prompt file by name and version
 */
async function loadPrompt(promptName, version) {
  try {
    const promptPath = path.join(PROMPT_DIR, `${promptName}.json`);
    
    // Check if prompt file exists
    if (!fs.existsSync(promptPath)) {
      console.log(`Prompt file not found: ${promptPath}`);
      initializeDefaultPrompts();
    }
    
    // Read and parse prompt file
    const promptContent = fs.readFileSync(promptPath, 'utf8');
    const prompt = JSON.parse(promptContent);
    
    // Check version compatibility
    if (prompt.version !== version) {
      console.log(`Warning: Using prompt version ${prompt.version} instead of requested ${version}`);
    }
    
    return prompt;
  } catch (error) {
    console.error(`Error loading prompt ${promptName}:`, error);
    
    // Return basic prompt structure as fallback
    return {
      version: PROMPT_VERSION,
      system: "You are an automotive dealership analyst. Analyze the data and provide insights.",
      user: "Analyze the following data and provide structured insights in JSON format."
    };
  }
}

/**
 * Prepare data for the prompt (sampling/formatting)
 */
function prepareDataForPrompt(data, platform) {
  // If data is already an array, use it directly
  if (Array.isArray(data)) {
    // Sample data if it's too large (avoid token limits)
    if (data.length > 20) {
      return {
        sample: data.slice(0, 20),
        totalCount: data.length,
        note: `Showing 20 of ${data.length} total records`
      };
    }
    return data;
  }
  
  // If data has 'records' field, use that
  if (data && data.records && Array.isArray(data.records)) {
    // Sample data if it's too large
    if (data.records.length > 20) {
      return {
        sample: data.records.slice(0, 20),
        totalCount: data.records.length,
        note: `Showing 20 of ${data.records.length} total records`
      };
    }
    return data.records;
  }
  
  // If data is a CSV content string
  if (data && data.type === 'csv' && data.content) {
    // For a real implementation, you'd parse the CSV here
    return {
      type: 'csv',
      content: data.content.substring(0, 1000) + '...',
      note: 'CSV content (truncated)'
    };
  }
  
  // If data is a file path
  if (data && data.type === 'unknown' && data.filePath) {
    return {
      type: 'file',
      path: data.filePath,
      note: 'File path only, content not parsed'
    };
  }
  
  // Fallback to using sample data
  return generateSampleReportData(platform);
}

/**
 * Generate sample report data for testing
 */
function generateSampleReportData(platform) {
  // Sample data patterns by platform
  const sampleData = {
    VinSolutions: [
      { Date: '2025-05-13', Customer: 'Customer A', Vehicle: 'Honda Accord', Status: 'New Lead', Price: 32500, DaysOnLot: 15, LeadSource: 'Website', SalesPerson: 'Rep 1' },
      { Date: '2025-05-13', Customer: 'Customer B', Vehicle: 'Toyota Camry', Status: 'Test Drive', Price: 29800, DaysOnLot: 22, LeadSource: 'Phone', SalesPerson: 'Rep 2' },
      { Date: '2025-05-13', Customer: 'Customer C', Vehicle: 'Ford F-150', Status: 'Negotiation', Price: 45600, DaysOnLot: 8, LeadSource: 'Walk-in', SalesPerson: 'Rep 3' },
      { Date: '2025-05-13', Customer: 'Customer D', Vehicle: 'Chevrolet Tahoe', Status: 'Purchased', Price: 52300, DaysOnLot: 30, LeadSource: 'Referral', SalesPerson: 'Rep 1' },
      { Date: '2025-05-13', Customer: 'Customer E', Vehicle: 'Nissan Altima', Status: 'New Lead', Price: 26400, DaysOnLot: 12, LeadSource: 'Website', SalesPerson: 'Rep 4' }
    ],
    VAUTO: [
      { 'Report Date': '2025-05-13', 'Stock#': 'A123', 'VIN': '1HGCM82633A123456', 'Make': 'Honda', 'Model': 'Accord', 'Price': 32500, 'Cost': 29500, 'Age': 15, 'Category': 'Sedan', 'Source': 'Auction' },
      { 'Report Date': '2025-05-13', 'Stock#': 'B234', 'VIN': '2T1BU4EE2AC123456', 'Make': 'Toyota', 'Model': 'Camry', 'Price': 29800, 'Cost': 27000, 'Age': 22, 'Category': 'Sedan', 'Source': 'Trade-in' },
      { 'Report Date': '2025-05-13', 'Stock#': 'C345', 'VIN': '1FTEX1EM5EF123456', 'Make': 'Ford', 'Model': 'F-150', 'Price': 45600, 'Cost': 41200, 'Age': 8, 'Category': 'Truck', 'Source': 'Dealer Transfer' },
      { 'Report Date': '2025-05-13', 'Stock#': 'D456', 'VIN': '3GNFK16Z23G123456', 'Make': 'Chevrolet', 'Model': 'Tahoe', 'Price': 52300, 'Cost': 47800, 'Age': 30, 'Category': 'SUV', 'Source': 'Auction' },
      { 'Report Date': '2025-05-13', 'Stock#': 'E567', 'VIN': '1N4AL3AP8DN123456', 'Make': 'Nissan', 'Model': 'Altima', 'Price': 26400, 'Cost': 23500, 'Age': 12, 'Category': 'Sedan', 'Source': 'Trade-in' }
    ],
    DealerTrack: [
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT123', 'Customer Name': 'Customer A', 'Vehicle': 'Honda Accord', 'Amount': 32500, 'Term': 60, 'Rate': 3.9, 'Product': 'Finance', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT234', 'Customer Name': 'Customer B', 'Vehicle': 'Toyota Camry', 'Amount': 29800, 'Term': 72, 'Rate': 4.2, 'Product': 'Lease', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT345', 'Customer Name': 'Customer C', 'Vehicle': 'Ford F-150', 'Amount': 45600, 'Term': 60, 'Rate': 3.5, 'Product': 'Finance', 'Type': 'Used' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT456', 'Customer Name': 'Customer D', 'Vehicle': 'Chevrolet Tahoe', 'Amount': 52300, 'Term': 48, 'Rate': 2.9, 'Product': 'Finance', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT567', 'Customer Name': 'Customer E', 'Vehicle': 'Nissan Altima', 'Amount': 26400, 'Term': 72, 'Rate': 4.5, 'Product': 'Lease', 'Type': 'New' }
    ]
  };
  
  // Return sample data for the requested platform, or a default if not available
  return sampleData[platform] || sampleData.VinSolutions;
}

// Export functions
export default {
  generateEnhancedInsights,
  PROMPT_VERSION
};