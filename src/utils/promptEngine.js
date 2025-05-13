/**
 * Prompt Engine Utility
 * 
 * This utility manages loading, versioning, and executing prompts used by the system.
 * It provides a centralized interface for working with prompt templates and tracking
 * their usage and performance.
 */

import fs from 'fs/promises';
import path from 'path';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Constants
const PROMPTS_DIR = path.join(process.cwd(), 'src', 'prompts');
const USE_MOCK_RESPONSES = process.env.USE_MOCK_RESPONSES === 'true';

/**
 * Prompt cache for avoiding repeated file system reads
 */
const promptCache = new Map();

/**
 * Load a prompt by name from the prompts directory
 * 
 * @param {string} promptName - The name of the prompt file (without extension)
 * @returns {Promise<Object>} The prompt template configuration
 */
export async function loadPrompt(promptName) {
  // Check cache first
  if (promptCache.has(promptName)) {
    return promptCache.get(promptName);
  }
  
  try {
    const promptPath = path.join(PROMPTS_DIR, `${promptName}.json`);
    const promptData = await fs.readFile(promptPath, 'utf-8');
    const promptConfig = JSON.parse(promptData);
    
    // Validate the prompt structure
    if (!promptConfig.system_prompt || !promptConfig.user_prompt_template) {
      throw new Error(`Invalid prompt format for ${promptName}`);
    }
    
    // Add to cache
    promptCache.set(promptName, promptConfig);
    return promptConfig;
  } catch (error) {
    console.error(`Error loading prompt ${promptName}:`, error.message);
    throw new Error(`Failed to load prompt: ${promptName}`);
  }
}

/**
 * Get all available prompts in the prompts directory
 * 
 * @returns {Promise<Array<Object>>} Array of prompt configurations
 */
export async function getAllPrompts() {
  try {
    const files = await fs.readdir(PROMPTS_DIR);
    const promptFiles = files.filter(file => file.endsWith('.json'));
    
    const prompts = await Promise.all(
      promptFiles.map(async file => {
        const promptName = path.basename(file, '.json');
        return {
          name: promptName,
          ...(await loadPrompt(promptName))
        };
      })
    );
    
    return prompts;
  } catch (error) {
    console.error('Error loading prompts:', error.message);
    return [];
  }
}

/**
 * Fill a prompt template with data
 * 
 * @param {string} template - The prompt template string
 * @param {Object} data - The data to inject into the template
 * @returns {string} The filled prompt template
 */
function fillPromptTemplate(template, data) {
  let filledTemplate = template;
  
  // Replace all {key} placeholders with corresponding data values
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return filledTemplate;
}

/**
 * Generate completion using a prompt template
 * 
 * @param {string} promptName - The name of the prompt template to use
 * @param {Object} data - The data to use in the prompt
 * @param {Object} options - Additional options for the prompt execution
 * @returns {Promise<Object>} The generated completion result
 */
export async function executePrompt(promptName, data, options = {}) {
  try {
    // Load the prompt configuration
    const promptConfig = await loadPrompt(promptName);
    
    // Fill the user prompt template with data
    const userPrompt = fillPromptTemplate(promptConfig.user_prompt_template, data);
    
    // For testing and development, optionally use mock responses
    if (USE_MOCK_RESPONSES) {
      return simulatePromptResponse(promptName, data);
    }
    
    // Check if we have a valid API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }
    
    // Create messages array
    const messages = [
      {
        role: 'system',
        content: promptConfig.system_prompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];
    
    // Log the execution if verbose
    if (options.verbose) {
      console.log(`Executing prompt: ${promptName}`);
      console.log('System prompt:', promptConfig.system_prompt);
      console.log('User prompt:', userPrompt);
    }
    
    // Start timestamp for tracking
    const startTime = Date.now();
    
    // Call the OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: promptConfig.model || 'gpt-4o',
      messages: messages,
      temperature: promptConfig.temperature !== undefined ? promptConfig.temperature : 0.7,
      max_tokens: promptConfig.max_tokens || 1000,
      response_format: promptConfig.response_format === 'json' ? { type: 'json_object' } : undefined
    });
    
    // Calculate execution time
    const executionTime = Date.now() - startTime;
    
    // Extract the content from the response
    const content = response.choices[0].message.content;
    
    // If response format is JSON, parse it
    let parsedResponse;
    if (promptConfig.response_format === 'json') {
      try {
        parsedResponse = JSON.parse(content);
      } catch (error) {
        console.error('Error parsing JSON response:', error.message);
        throw new Error('Failed to parse JSON response from OpenAI');
      }
    } else {
      parsedResponse = content;
    }
    
    // Return the result with metadata
    return {
      result: parsedResponse,
      meta: {
        promptName,
        promptVersion: promptConfig.version,
        executionTime,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`Error executing prompt ${promptName}:`, error.message);
    throw new Error(`Failed to execute prompt ${promptName}: ${error.message}`);
  }
}

/**
 * Create a new prompt file or update an existing one
 * 
 * @param {string} promptName - The name of the prompt
 * @param {Object} promptConfig - The prompt configuration
 * @returns {Promise<Object>} The created or updated prompt
 */
export async function savePrompt(promptName, promptConfig) {
  try {
    // Ensure the prompts directory exists
    await fs.mkdir(PROMPTS_DIR, { recursive: true });
    
    // Update metadata
    promptConfig.last_updated = new Date().toISOString();
    
    // Write the prompt file
    const promptPath = path.join(PROMPTS_DIR, `${promptName}.json`);
    await fs.writeFile(promptPath, JSON.stringify(promptConfig, null, 2), 'utf-8');
    
    // Update cache
    promptCache.set(promptName, promptConfig);
    
    return promptConfig;
  } catch (error) {
    console.error(`Error saving prompt ${promptName}:`, error.message);
    throw new Error(`Failed to save prompt: ${promptName}`);
  }
}

/**
 * Simulate a response for testing purposes
 * 
 * @param {string} promptName - The name of the prompt
 * @param {Object} data - The data used in the prompt
 * @returns {Object} A simulated response
 */
function simulatePromptResponse(promptName, data) {
  // Default simulation response
  const defaultResponse = {
    result: {
      message: "This is a simulated response for testing",
      data: { ...data }
    },
    meta: {
      promptName,
      promptVersion: "simulated",
      executionTime: 123,
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      timestamp: new Date().toISOString()
    }
  };
  
  // Specific simulated responses based on prompt name
  switch (promptName) {
    case 'automotive-analyst':
      return {
        result: {
          summary: "Simulated analysis of dealership performance data",
          value_insights: [
            "SUV models are the strongest performers",
            "John Smith is the top salesperson"
          ],
          actionable_flags: [
            "Focus marketing on SUV models",
            "Implement sales training program"
          ],
          key_metrics: {
            totalVehicles: 42,
            totalSalesValue: 1876500,
            averageGrossProfit: 3642
          },
          risk_areas: [
            {
              risk: "Four deals below profit threshold",
              mitigation: "Implement floor pricing policy"
            }
          ],
          confidence: "high"
        },
        meta: defaultResponse.meta
      };
      
    case 'quality-evaluation':
      return {
        result: {
          quality_dimensions: {
            completeness: 8.5,
            relevance: 9.0,
            specificity: 7.5,
            coherence: 8.5,
            innovation: 7.0
          },
          strengths: [
            "Clear identification of top performers",
            "Specific recommendations tied to data"
          ],
          improvement_areas: [
            "Could include trend analysis vs previous periods",
            "Limited customer demographic insights"
          ],
          verification_steps: [
            "Verify sales performance data",
            "Check gross profit calculations"
          ],
          overall_score: 81
        },
        meta: defaultResponse.meta
      };
      
    default:
      return defaultResponse;
  }
}