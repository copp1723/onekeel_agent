import { Eko, LLMs } from '@eko-ai/eko';
import { ExecutionPlan, PlanStep } from '../agent/executePlan.js';

// Define the task types the agent can handle
export enum TaskType {
  WebCrawling = 'web_crawling',
  WebContentExtraction = 'web_content_extraction',
  SummarizeText = 'summarize_text',
  FlightStatus = 'flight_status',
  DealerLogin = 'dealer_login',
  VehicleData = 'vehicle_data',
  MultiStep = 'multi_step',
  Unknown = 'unknown'
}

// Define the parsed task structure
export interface ParsedTask {
  type: TaskType;
  parameters: Record<string, any>;
  original: string;
  plan?: ExecutionPlan; // For multi-step tasks
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
  
  // Check for multi-step tasks that involve extracting content and then summarizing
  if ((taskLower.includes('extract') && taskLower.includes('content') && 
       (taskLower.includes('summarize') || taskLower.includes('summary'))) ||
      (taskLower.includes('summarize') && taskLower.includes('content of'))) {
    
    const urlMatch = task.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : '';
    
    if (url) {
      // Create a multi-step plan
      return {
        type: TaskType.MultiStep,
        parameters: { url },
        original: task,
        plan: {
          steps: [
            {
              tool: 'extractCleanContent',
              input: { url }
            },
            {
              tool: 'summarizeText',
              input: { text: '{{step0.output.content}}' }
            }
          ]
        }
      };
    }
  }
  
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
  // Summarize text task
  else if (taskLower.includes('summarize') && taskLower.includes('text')) {
    // This is a summarization task
    const text = task.replace(/summarize\s+text[:\s]*/i, '').trim();
    
    return {
      type: TaskType.SummarizeText,
      parameters: {
        text
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
      
      Available tools:
      - extractCleanContent - Extracts clean text content from a URL
      - summarizeText - Summarizes text content
      - checkFlightStatus - Checks status of a flight
      - crawlWebsite - Crawls and extracts data from websites
      
      Task categories:
      1. web_crawling - For tasks about crawling websites, scraping data
      2. web_content_extraction - For extracting clean content from websites
      3. summarize_text - For summarizing text content
      4. flight_status - For checking flight status
      5. dealer_login - For dealer login related tasks
      6. vehicle_data - For extracting vehicle information
      7. multi_step - For tasks that require multiple steps
      8. unknown - For tasks that don't fit the above categories
      
      For multi-step tasks, create an execution plan with the tools needed in sequence.
      
      For simple tasks, return a JSON with:
      - type: One of the task categories above
      - parameters: Key parameters needed for the task

      For multi-step tasks, return a JSON with:
      - type: "multi_step"
      - parameters: Key parameters needed for the main task
      - plan: {
          steps: [
            { tool: "toolName", input: { param1: "value1", param2: "value2" } },
            { tool: "toolName2", input: { param1: "{{step0.output.fieldName}}" } }
          ]
        }
      
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
        
        // Check if this is a multi-step task with a plan
        if (parsed.type === 'multi_step' && parsed.plan && parsed.plan.steps) {
          return {
            type: TaskType.MultiStep,
            parameters: parsed.parameters || {},
            original: task,
            plan: parsed.plan as ExecutionPlan
          };
        }
        
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