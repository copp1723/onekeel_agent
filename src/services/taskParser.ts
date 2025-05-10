import { Eko, LLMs } from '@eko-ai/eko';

// Define the task types the agent can handle
export enum TaskType {
  WebCrawling = 'web_crawling',
  WebContentExtraction = 'web_content_extraction',
  FlightStatus = 'flight_status',
  DealerLogin = 'dealer_login',
  VehicleData = 'vehicle_data',
  Unknown = 'unknown'
}

// Define the parsed task structure
export interface ParsedTask {
  type: TaskType;
  parameters: Record<string, any>;
  original: string;
}

/**
 * Uses an LLM to parse a natural language task into a structured format
 * @param task - The natural language task description
 * @param ekoApiKey - The Eko API key for the LLM call
 * @returns The parsed task with type and parameters
 */
export async function parseTask(task: string, ekoApiKey: string): Promise<ParsedTask> {
  // For a simple implementation, we'll use a rule-based approach
  // In a more complex system, you would use the LLM for this
  const taskLower = task.toLowerCase();
  
  // Extract clean content tasks
  if ((taskLower.includes('extract') && taskLower.includes('clean content')) || 
      (taskLower.includes('get') && taskLower.includes('article text')) ||
      (taskLower.includes('extract') && taskLower.includes('readable'))) {
    // This is a content extraction task
    const urlMatch = task.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : '';
    
    return {
      type: TaskType.WebContentExtraction,
      parameters: {
        url
      },
      original: task
    };
  }
  // Regular web crawling tasks
  else if (taskLower.includes('crawl') || taskLower.includes('scrape') || 
      (taskLower.includes('extract') && !taskLower.includes('clean content'))) {
    // This is likely a web crawling task
    const urlMatch = task.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : '';
    
    return {
      type: TaskType.WebCrawling,
      parameters: {
        url,
        // Extract other potential parameters - for a full implementation,
        // you'd use the LLM to extract these more intelligently
        selector: taskLower.includes('selector') ? 'auto-detect' : undefined,
        depth: taskLower.includes('depth') ? 1 : undefined,
        extractFields: []
      },
      original: task
    };
  } 
  else if (taskLower.includes('flight') && 
          (taskLower.includes('status') || taskLower.includes('check'))) {
    // This is likely a flight status check
    // Extract flight number - basic implementation
    const flightMatch = task.match(/([A-Z]{2}|[A-Z]\d|\d[A-Z])\d{1,4}/i);
    const flightNumber = flightMatch ? flightMatch[0] : '';
    
    return {
      type: TaskType.FlightStatus,
      parameters: {
        flightNumber,
        date: new Date().toISOString().split('T')[0] // Default to today
      },
      original: task
    };
  }
  else if (taskLower.includes('dealer') && 
           (taskLower.includes('login') || taskLower.includes('credentials'))) {
    // This is likely a dealer login task
    // Extract dealer ID - basic implementation
    const dealerIdMatch = task.match(/dealer[:\s]+(\w+)/i);
    const dealerId = dealerIdMatch ? dealerIdMatch[1] : '';
    
    return {
      type: TaskType.DealerLogin,
      parameters: {
        dealerId
      },
      original: task
    };
  }
  else if (taskLower.includes('vehicle') || 
           taskLower.includes('car') || 
           taskLower.includes('window sticker')) {
    // This is likely a vehicle data task
    // Extract VIN if present - basic implementation
    const vinMatch = task.match(/VIN[:\s]+([A-HJ-NPR-Z0-9]{17})/i);
    const vin = vinMatch ? vinMatch[1] : '';
    
    return {
      type: TaskType.VehicleData,
      parameters: {
        vin
      },
      original: task
    };
  }
  
  // For anything else or if detection fails, return unknown
  return {
    type: TaskType.Unknown,
    parameters: {},
    original: task
  };
}

/**
 * Uses the LLM to parse a task (more advanced implementation)
 * @param task - The natural language task
 * @param ekoApiKey - Eko API key
 * @returns Parsed task
 */
export async function parseTaskWithLLM(task: string, ekoApiKey: string): Promise<ParsedTask> {
  try {
    // Configure LLMs (using the default provider)
    const llms: LLMs = {
      default: {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: ekoApiKey,
      }
    };
    
    // Initialize Eko agent
    const eko = new Eko({ llms });
    
    // Define the parsing prompt
    const parsingPrompt = `
      You are a task parsing agent. Your job is to categorize user tasks and extract relevant parameters.
      
      Task categories:
      1. web_crawling - For tasks about crawling websites, scraping data
      2. flight_status - For checking flight status
      3. dealer_login - For dealer login related tasks
      4. vehicle_data - For extracting vehicle information
      5. unknown - For tasks that don't fit the above categories
      
      For the following task, return a JSON object with:
      - type: One of the task categories above
      - parameters: Key parameters needed for the task
      
      Task: "${task}"
      
      JSON:
    `;
    
    // Generate a response
    const response = await eko.run(parsingPrompt);
    
    // Parse the JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: parsed.type as TaskType,
          parameters: parsed.parameters || {},
          original: task
        };
      } catch (e) {
        console.error('Failed to parse LLM response as JSON', e);
      }
    }
    
    // Fallback to rule-based parsing if LLM parsing fails
    return parseTask(task, ekoApiKey);
  } catch (error) {
    console.error('Error using LLM for task parsing:', error);
    // Fallback to rule-based parsing
    return parseTask(task, ekoApiKey);
  }
}