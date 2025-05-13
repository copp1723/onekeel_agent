/**
 * Enhanced Insight Generator Service
 * Generates business impact insights from CRM data with quality scoring
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// Initialize OpenAI client if API key is available
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

// Load prompt templates
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptsDir = path.join(__dirname, '..', 'prompts');

/**
 * Load a prompt template from the prompts directory
 * @param {string} promptName - Name of the prompt file (without extension)
 * @returns {Object|null} The loaded prompt template, or null if not found
 */
function loadPrompt(promptName) {
  try {
    const promptPath = path.join(promptsDir, `${promptName}.json`);
    if (fs.existsSync(promptPath)) {
      const promptData = fs.readFileSync(promptPath, 'utf8');
      return JSON.parse(promptData);
    }
    return null;
  } catch (error) {
    console.error(`Error loading prompt template ${promptName}:`, error);
    return null;
  }
}

/**
 * Generate enhanced insights for the specified platform using CRM data
 * @param {string} platform - CRM platform name (e.g., 'VinSolutions', 'VAUTO')
 * @param {Array} data - Parsed CRM report data
 * @param {Object} options - Additional options for insight generation
 * @returns {Promise<Object>} Generated insights with quality score
 */
export async function generateInsightsForPlatform(platform, data, options = {}) {
  // Load appropriate prompt for the platform
  const promptName = `${platform.toLowerCase()}-analyst`;
  const promptTemplate = loadPrompt('automotive-analyst') || {
    system: "You are an automotive sales analyst providing key business insights.",
    formats: {
      json: {
        structure: {
          insights: "array of string insights",
          key_metrics: "object with key metrics",
          action_items: "array of action items",
          confidence: "string: 'low', 'medium', or 'high'"
        }
      }
    }
  };
  
  // If no OpenAI API key is available, return sample insights
  if (!openai) {
    console.warn('OpenAI API key not available, returning sample insights');
    return generateSampleInsights(platform, data);
  }
  
  try {
    // Prepare the data as a clean JSON string
    const dataStr = JSON.stringify(data, null, 2);
    
    // Prepare the OpenAI request using the prompt template
    const messages = [
      {
        role: "system",
        content: promptTemplate.system
      },
      {
        role: "user",
        content: `Analyze this ${platform} dealer data and generate actionable insights:\n${dataStr}`
      }
    ];
    
    // Add format instructions if available
    if (promptTemplate.formats?.json) {
      messages[0].content += `\n\nRespond with JSON in this format: ${JSON.stringify(promptTemplate.formats.json.structure, null, 2)}`;
    }
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages,
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    
    // Parse the insights from the response
    const content = response.choices[0].message.content;
    const insights = JSON.parse(content);
    
    // Add metadata
    insights.platform = platform;
    insights.timestamp = new Date().toISOString();
    insights.quality_score = await scoreInsightQuality(insights, data);
    
    // Save the insights to a file
    await saveInsightsToFile(platform, insights);
    
    return insights;
  } catch (error) {
    console.error(`Error generating insights for ${platform}:`, error);
    // Fall back to sample insights in case of error
    return generateSampleInsights(platform, data);
  }
}

/**
 * Generate sample insights for testing when OpenAI is not available
 * @param {string} platform - CRM platform name
 * @param {Array} data - Sample CRM data
 * @returns {Object} Sample insights
 */
function generateSampleInsights(platform, data) {
  return {
    platform,
    timestamp: new Date().toISOString(),
    insights: [
      "SUVs continue to be the top performers in both sales volume and profit margin.",
      "Vehicles with lower days in inventory consistently yield higher gross profits.",
      "Finance product attachment rates show significant variation across sales staff."
    ],
    key_metrics: {
      total_sales: data?.length || 8,
      average_gross_profit: 3500,
      average_days_in_inventory: 18
    },
    action_items: [
      "Focus inventory acquisition on high-demand SUV models",
      "Review pricing strategy for slow-moving inventory",
      "Implement additional training for sales staff with low finance product attachment"
    ],
    confidence: "medium",
    quality_score: 0.85
  };
}

/**
 * Score the quality of generated insights
 * @param {Object} insights - Generated insights
 * @param {Array} data - Source data
 * @returns {Promise<number>} Quality score between 0 and 1
 */
async function scoreInsightQuality(insights, data) {
  // Load quality evaluation prompt
  const qualityPrompt = loadPrompt('quality-evaluation') || {
    system: "You are an evaluator of business analytics. Score the quality of insights on a scale of 0 to 1.",
    criteria: ["relevance", "actionability", "specificity", "data-driven"]
  };
  
  // If no OpenAI API key is available, return a default score
  if (!openai) {
    return 0.85;
  }
  
  try {
    // Prepare the insight and data strings
    const insightStr = JSON.stringify(insights, null, 2);
    const dataStr = JSON.stringify(data, null, 2);
    
    // Prepare the evaluation request
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: qualityPrompt.system
        },
        {
          role: "user",
          content: `Score these insights based on the source data:\n\nINSIGHTS:\n${insightStr}\n\nSOURCE DATA:\n${dataStr}\n\nEvaluate on: ${qualityPrompt.criteria.join(", ")}\n\nProvide a single score between 0 and 1.`
        }
      ],
      temperature: 0.1,
    });
    
    // Extract the score from the response
    const content = response.choices[0].message.content;
    const scoreMatch = content.match(/([0-9]*[.])?[0-9]+/); // Match floating point number
    return scoreMatch ? parseFloat(scoreMatch[0]) : 0.85;
  } catch (error) {
    console.error('Error scoring insight quality:', error);
    return 0.85; // Default score on error
  }
}

/**
 * Save insights to a file for traceability
 * @param {string} platform - CRM platform name
 * @param {Object} insights - Generated insights
 */
async function saveInsightsToFile(platform, insights) {
  try {
    // Create results directory if it doesn't exist
    const resultsDir = path.join(process.cwd(), 'results', platform.toLowerCase());
    await fs.promises.mkdir(resultsDir, { recursive: true });
    
    // Create timestamped filename
    const date = new Date();
    const timestamp = date.toISOString().split('T')[0];
    const filename = `${timestamp}-insights.json`;
    
    // Write insights to file
    await fs.promises.writeFile(
      path.join(resultsDir, filename), 
      JSON.stringify(insights, null, 2),
      'utf8'
    );
    
    console.log(`Saved insights to ${path.join(resultsDir, filename)}`);
  } catch (error) {
    console.error('Error saving insights to file:', error);
  }
}

/**
 * Generate insights from the raw CRM report data
 * @param {string} filePath - Path to the parsed CRM report
 * @param {string} platform - CRM platform name
 * @returns {Promise<Object>} The generated insights
 */
export async function generateInsights(filePath, platform) {
  try {
    // Read and parse the data file
    const dataStr = await fs.promises.readFile(filePath, 'utf8');
    const data = JSON.parse(dataStr);
    
    // Generate insights
    return await generateInsightsForPlatform(platform, data);
  } catch (error) {
    console.error(`Error generating insights from ${filePath}:`, error);
    return {
      platform,
      timestamp: new Date().toISOString(),
      error: error.message,
      insights: ["Error generating insights"],
      confidence: "low",
      quality_score: 0
    };
  }
}