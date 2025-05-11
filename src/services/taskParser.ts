import { Eko, LLMs } from '@eko-ai/eko';
import { ExecutionPlan, PlanStep } from '../agent/executePlan.js';
import { db } from '../shared/db.js';
import { plans } from '../shared/schema.js';
import * as crypto from 'crypto';

// Define the task types the agent can handle
export enum TaskType {
  WebCrawling = 'web_crawling',
  WebContentExtraction = 'web_content_extraction',
  SummarizeText = 'summarize_text',
  FlightStatus = 'flight_status',
  DealerLogin = 'dealer_login',
  VehicleData = 'vehicle_data',
  FetchCRMReport = 'fetch_crm_report',
  MultiStep = 'multi_step',
  Unknown = 'unknown'
}

// Define the parsed task structure
export interface ParsedTask {
  type: TaskType;
  parameters: Record<string, any>;
  original: string;
  plan?: ExecutionPlan; // For multi-step tasks
  error?: string; // Optional error message for invalid tasks
  planId?: string; // Database ID for the execution plan
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
  const taskHash = crypto.createHash('md5').update(task).digest('hex').substring(0, 8);
  
  console.log(`[${taskHash}] 🔎 Task parser analyzing: ${task}`);
  console.log(`[${taskHash}] Task lowercase: "${taskLower}"`);
  
  // Log keyword detection more clearly
  const hasKeywords = {
    'summarize': taskLower.includes('summarize'),
    'summary': taskLower.includes('summary'),
    'content': taskLower.includes('content'),
    'from': taskLower.includes('from'),
    'of': taskLower.includes('of'),
    'text': taskLower.includes('text')
  };
  
  console.log(`[${taskHash}] Detected keywords:`, JSON.stringify(hasKeywords, null, 2));
  
  // Improved pattern matching for multi-step tasks
  // Define regex patterns for more precise matching
  const extractPatterns = [
    /\bextract\b/i,
    /\bget\s+.*\bcontent\b/i,
    /\bpull\s+.*\bcontent\b/i,
    /\bfetch\s+.*\btext\b/i,
    /\bextract\s+.*\btext\b/i,
  ];
  
  const summarizePatterns = [
    /\bsummariz(e|ation)\b/i,
    /\bsummary\b/i,
    /\bsummarise\b/i,
    /\bcondense\b/i,
    /\btl;dr\b/i,
  ];
  
  const sourcePatterns = [
    /\bcontent\s+of\b/i,
    /\bcontent\s+from\b/i,
    /\bfrom\b/i,
    /\bof\b/i,
    /\btext\b/i,
    /\bwebsite\b/i,
    /\bpage\b/i,
    /\barticle\b/i,
    /\burl\b/i,
    /\blink\b/i,
    /\bweb\b/i,
  ];
  
  // Check if task matches extract AND summarize patterns
  const hasExtractPattern = extractPatterns.some(pattern => pattern.test(taskLower));
  const hasSummarizePattern = summarizePatterns.some(pattern => pattern.test(taskLower));
  const hasSourcePattern = sourcePatterns.some(pattern => pattern.test(taskLower));
  
  // Multi-step task detection logic with detailed logging
  const isMultiStepExtractAndSummarize = hasExtractPattern && hasSummarizePattern;
  const isMultiStepSummarizeContent = hasSummarizePattern && hasSourcePattern;
  
  console.log('Task patterns:', {
    extractPattern: hasExtractPattern,
    summarizePattern: hasSummarizePattern,
    sourcePattern: hasSourcePattern,
    isMultiStepExtractAndSummarize,
    isMultiStepSummarizeContent
  });
  
  if (isMultiStepExtractAndSummarize || isMultiStepSummarizeContent) {
    
    console.log('Detected potential multi-step task pattern');
    
    // Enhanced URL extraction
    // Match both http/https URLs and domain-only references
    const strictUrlMatch = task.match(/https?:\/\/[^\s'"`)]+/);
    const domainMatch = !strictUrlMatch ? task.match(/\b([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/i) : null;
    
    let url = '';
    if (strictUrlMatch) {
      url = strictUrlMatch[0];
      // Strip trailing punctuation that might be part of the match
      url = url.replace(/[.,;:!?)]+$/, '');
    } else if (domainMatch) {
      url = 'https://' + domainMatch[0];
    }
    
    console.log('URL detected:', url || 'None');
    
    if (url) {
      // Create a complete multi-step plan with detailed configuration
      let multiStepPlan: ParsedTask;
      
      try {
        // First, create a plan entry in the database
        const [planRecord] = await db.insert(plans).values({
          task: task
        }).returning({ id: plans.id });
        
        const planId = planRecord.id;
        console.log(`Created plan record with ID: ${planId}`);
        
        multiStepPlan = {
          type: TaskType.MultiStep,
          parameters: { url },
          original: task,
          planId: planId,
          plan: {
            planId: planId,
            taskText: task,
            steps: [
              {
                tool: 'extractCleanContent',
                input: { 
                  url,
                  fallbackMessage: 'Could not extract content from the provided URL'
                }
              },
              {
                tool: 'summarizeText',
                input: { 
                  text: '{{step0.output.content}}', 
                  maxLength: 300,
                  format: 'paragraph',
                  fallbackBehavior: 'passthrough' // Pass through original content if summarization fails
                }
              }
            ]
          }
        };
      } catch (error) {
        console.error('Error creating plan record:', error);
        multiStepPlan = {
          type: TaskType.MultiStep,
          parameters: { url },
          original: task,
          plan: {
            steps: [
              {
                tool: 'extractCleanContent',
                input: { 
                  url,
                  fallbackMessage: 'Could not extract content from the provided URL'
                }
              },
              {
                tool: 'summarizeText',
                input: { 
                  text: '{{step0.output.content}}', 
                  maxLength: 300,
                  format: 'paragraph',
                  fallbackBehavior: 'passthrough' // Pass through original content if summarization fails
                }
              }
            ]
          }
        };
      }
      
      console.log('Generated multi-step plan:', JSON.stringify(multiStepPlan, null, 2));
      return multiStepPlan;
    } else {
      // No URL found, but it's a summarization-related task
      console.log('Multi-step pattern detected but no URL found');
      return {
        type: TaskType.Unknown,
        parameters: {},
        original: task,
        error: 'No valid URL detected in task. Please include a URL.'
      };
    }
  }
  
  // Extract clean content tasks
  if ((taskLower.includes('extract') && taskLower.includes('clean content')) || 
      (taskLower.includes('get') && taskLower.includes('article text')) ||
      (taskLower.includes('extract') && taskLower.includes('readable'))) {
    
    console.log('Detected content extraction task');
    
    // Use the same enhanced URL extraction as multi-step tasks
    const strictUrlMatch = task.match(/https?:\/\/[^\s'"`)]+/);
    const domainMatch = !strictUrlMatch ? task.match(/\b([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/i) : null;
    
    let url = '';
    if (strictUrlMatch) {
      url = strictUrlMatch[0];
      url = url.replace(/[.,;:!?)]+$/, '');
    } else if (domainMatch) {
      url = 'https://' + domainMatch[0];
    }
    
    console.log('URL detected for extraction:', url || 'None');
    
    if (url) {
      return {
        type: TaskType.WebContentExtraction,
        parameters: { url },
        original: task
      };
    } else {
      return {
        type: TaskType.Unknown,
        parameters: {},
        original: task,
        error: 'No valid URL detected in task. Please include a URL.'
      };
    }
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
    
    console.log('Detected web crawling task');
    
    // Enhanced URL extraction
    const strictUrlMatch = task.match(/https?:\/\/[^\s'"`)]+/);
    const domainMatch = !strictUrlMatch ? task.match(/\b([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/i) : null;
    
    let url = '';
    if (strictUrlMatch) {
      url = strictUrlMatch[0];
      url = url.replace(/[.,;:!?)]+$/, '');
    } else if (domainMatch) {
      url = 'https://' + domainMatch[0];
    }
    
    console.log('URL detected for crawling:', url || 'None');
    
    if (url) {
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
    } else {
      return {
        type: TaskType.Unknown,
        parameters: {},
        original: task,
        error: 'No valid URL detected in task. Please include a URL.'
      };
    }
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
  else if ((taskLower.includes('dealer') || taskLower.includes('dealership')) && 
           (taskLower.includes('login') || taskLower.includes('credentials') || 
            taskLower.includes('log in') || taskLower.includes('sign in'))) {
    // This is a dealer login task
    console.log('Detected dealer login task');
    
    // Enhanced dealer ID extraction with multiple patterns
    const dealerIdMatch = task.match(/dealer(?:ship)?\s+id\s*[:=]?\s*([a-zA-Z0-9_-]+)/i) || 
                          task.match(/(?:^|\s)id\s*[:=]?\s*([a-zA-Z0-9_-]+)/i) ||
                          task.match(/dealer[:\s]+(\w+)/i);
    
    const dealerId = dealerIdMatch ? dealerIdMatch[1] : '';
    
    // Extract optional site URL if present
    const siteUrlMatch = task.match(/(?:site|url|website)[:\s]+\s*(https?:\/\/[^\s]+)/i);
    let siteUrl = '';
    
    if (siteUrlMatch) {
      siteUrl = siteUrlMatch[1].trim();
      siteUrl = siteUrl.replace(/[.,;:!?)]+$/, '');
      console.log('Site URL detected:', siteUrl);
    }
    
    if (!dealerId) {
      return {
        type: TaskType.Unknown,
        parameters: {},
        original: task,
        error: 'No valid dealer ID detected. Please include a dealer ID in your request.'
      };
    }
    
    console.log('Dealer ID detected:', dealerId);
    
    return {
      type: TaskType.DealerLogin,
      parameters: {
        dealerId,
        ...(siteUrl ? { siteUrl } : {})
      },
      original: task
    };
  }
  // CRM Report extraction tasks
  else if ((taskLower.includes('crm') || taskLower.includes('sales') || taskLower.includes('vinsolutions')) && 
          (taskLower.includes('report') || taskLower.includes('data') || 
           taskLower.includes('deals') || taskLower.includes('yesterday'))) {
    
    console.log(`[${taskHash}] 🏆 Detected CRM report extraction task`);
    console.log(`[${taskHash}] Matching keywords:`, {
      hasCRM: taskLower.includes('crm'),
      hasSales: taskLower.includes('sales'),  
      hasVinSolutions: taskLower.includes('vinsolutions'),
      hasReport: taskLower.includes('report'),
      hasData: taskLower.includes('data'),
      hasDeals: taskLower.includes('deals'),
      hasYesterday: taskLower.includes('yesterday')
    });
    
    // Extract dealer site/system if specified
    let site = '';
    
    // Check for specific CRM system mentions
    const crmSystems = ['vinsolutions', 'dealersocket', 'elead', 'cdk'];
    for (const system of crmSystems) {
      if (taskLower.includes(system)) {
        site = system;
        break;
      }
    }
    
    // If no specific CRM mentioned, default to VinSolutions
    if (!site) {
      site = 'vinsolutions';
    }
    
    console.log('CRM system detected:', site);
    
    // Extract date if specified
    const dateMatch = task.match(/for\s+(\d{4}-\d{2}-\d{2})/i) || 
                     task.match(/on\s+(\d{4}-\d{2}-\d{2})/i);
    const date = dateMatch ? dateMatch[1] : '';
    
    // Check if this is a multi-step task needing login first
    const needsLogin = taskLower.includes('login') || 
                      !taskLower.includes('logged in') || 
                      taskLower.includes('credentials');
    
    // Get a dealer ID using a more robust extraction approach
    let dealerId = '';
    
    // Try to match a dealer ID specified explicitly
    const explicitDealerIdMatch = task.match(/dealer(?:ship)?\s+id\s*[:=]?\s*([a-zA-Z0-9_-]+)/i) || 
                            task.match(/dealer[:\s]+(\w+)/i);
                            
    if (explicitDealerIdMatch) {
      dealerId = explicitDealerIdMatch[1];
      console.log(`[${taskHash}] 🔍 Found explicit dealer ID:`, dealerId);
    }
    // If no explicit dealer ID, look for alphanumeric codes that might be dealer IDs
    else {
      const simpleDealerIdMatch = task.match(/\b([A-Z0-9]{3,})\b/);
      if (simpleDealerIdMatch) {
        dealerId = simpleDealerIdMatch[1];
        console.log(`[${taskHash}] 🔍 Extracted potential dealer ID from text:`, dealerId);
      } 
      // For testing, provide a default dealer ID if the test string 'ABC123' is found
      else if (taskLower.includes('abc123')) {
        dealerId = 'ABC123';
        console.log(`[${taskHash}] 🔍 Using test dealer ID:`, dealerId);
      }
    }
    
    // Skip the need for database operations for now to simplify debugging
    console.log(`[${taskHash}] 🔑 Dealer ID for CRM report:`, dealerId || "None specified");
    
    // Regardless of dealer ID, return as a fetchCRMReport task type
    return {
      type: TaskType.FetchCRMReport,
      parameters: {
        site,
        ...(dealerId ? { dealerId } : {}),
        ...(date ? { date } : {})
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
  
  // For anything else or if detection fails, check for summarize-related keywords
  if (taskLower.includes('summarize') || taskLower.includes('summary')) {
    console.log(`[${taskHash}] ⚠️ MISSING URL: Detected summarize keywords but no URL matched patterns`);
    
    // Try once more for URL patterns with a more lenient regex
    const lenientMatch = taskLower.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i);
    if (lenientMatch) {
      console.log(`[${taskHash}] 🔍 Found possible domain with lenient regex:`, lenientMatch[0]);
      
      // Try to construct a multi-step plan with this domain
      const url = 'https://' + lenientMatch[0];
      
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
    
    // No URL found, return error
    console.log(`[${taskHash}] ❌ ERROR: No valid URL detected in summarize task`);
    return {
      type: TaskType.Unknown,
      parameters: {},
      original: task,
      error: 'No valid URL detected in task. Please include a URL.'
    };
  }
  
  // Default case
  console.log(`[${taskHash}] ℹ️ Task type not recognized, marking as unknown`);
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
      - dealerLogin - Logs into dealer systems with credentials
      - fetchCRMReport - Extracts reports from dealer CRM systems
      
      Task categories:
      1. web_crawling - For tasks about crawling websites, scraping data
      2. web_content_extraction - For extracting clean content from websites
      3. summarize_text - For summarizing text content
      4. flight_status - For checking flight status
      5. dealer_login - For dealer login related tasks
      6. vehicle_data - For extracting vehicle information
      7. fetch_crm_report - For retrieving dealer CRM sales reports
      8. multi_step - For tasks that require multiple steps
      9. unknown - For tasks that don't fit the above categories
      
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
          try {
            // Create a plan entry in database
            const [planRecord] = await db.insert(plans).values({
              task: task
            }).returning({ id: plans.id });
            
            const planId = planRecord.id;
            console.log(`Created plan record with ID: ${planId} (LLM-generated)`);
            
            // Add plan ID to execution plan
            parsed.plan.planId = planId;
            parsed.plan.taskText = task;
            
            return {
              type: TaskType.MultiStep,
              parameters: parsed.parameters || {},
              original: task,
              planId: planId,
              plan: parsed.plan as ExecutionPlan
            };
          } catch (dbError) {
            console.error('Error creating plan record:', dbError);
            
            return {
              type: TaskType.MultiStep,
              parameters: parsed.parameters || {},
              original: task,
              plan: parsed.plan as ExecutionPlan
            };
          }
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