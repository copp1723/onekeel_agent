/**
 * Task Parser Service
 * Parses natural language tasks into structured data for processing
 */
import { Eko } from '@eko-ai/eko';
import { z } from 'zod';

// Define the schema for parsed tasks
export const ParsedTask = z.object({
  type: z.string(),
  parameters: z.record(z.any()),
  intent: z.string().optional(),
  platform: z.string().optional()
});

export const TaskTypes = {
  WEB_CRAWL: 'web_crawl',
  FLIGHT_STATUS: 'flight_status',
  DEALER_INTERACTION: 'dealer_interaction',
  UNKNOWN: 'unknown'
};

/**
 * Parse a natural language task into a structured format
 * @param {string} taskText - The natural language task description
 * @param {string} [apiKey] - Optional Eko API key
 * @returns {Promise<z.infer<typeof ParsedTask>>} The parsed task
 */
export async function parseTask(taskText, apiKey = process.env.EKO_API_KEY) {
  try {
    if (!taskText) {
      throw new Error('Task text is required');
    }

    // Initialize Eko client
    const eko = new Eko({
      apiKey: apiKey || '',
      defaultModel: 'gpt-4-turbo'
    });

    // Define the task parsing prompt
    const prompt = `
      You are a task parsing assistant. Your job is to analyze the following task and extract structured information.

      Task: "${taskText}"

      Determine the type of task from these categories:
      - web_crawl: Tasks that involve crawling a website or extracting information from a URL
      - flight_status: Tasks that involve checking flight status
      - dealer_interaction: Tasks that involve interacting with dealer systems or CRMs
      - unknown: If the task doesn't fit any of the above categories

      Extract any relevant parameters such as:
      - For web_crawl: url, query, depth
      - For flight_status: airline, flightNumber, date
      - For dealer_interaction: dealerId, action, platform

      Also determine the general intent of the task and the platform it relates to, if applicable.

      Return your analysis as a JSON object with these fields:
      {
        "type": "task_type",
        "parameters": {
          // All extracted parameters relevant to the task
        },
        "intent": "general intent of the task",
        "platform": "platform name if applicable"
      }
    `;

    // Use Eko to parse the task
    const response = await eko.complete({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      responseFormat: { type: 'json_object' }
    });

    // Parse the JSON response
    const content = response.choices[0]?.message?.content || '';
    const parsedResponse = JSON.parse(content);

    // Validate the response against our schema
    const validatedTask = ParsedTask.parse(parsedResponse);

    return validatedTask;
  } catch (error) {
    console.error('Error parsing task:', error);

    // Return a default unknown task type if parsing fails
    return {
      type: TaskTypes.UNKNOWN,
      parameters: { raw: taskText },
      intent: 'unknown',
      platform: 'none'
    };
  }
}

/**
 * Determine if a task requires web crawling
 * @param {z.infer<typeof ParsedTask>} parsedTask - The parsed task
 * @returns {boolean} Whether the task requires web crawling
 */
export function isWebCrawlTask(parsedTask) {
  return parsedTask.type === TaskTypes.WEB_CRAWL;
}

/**
 * Determine if a task requires flight status checking
 * @param {z.infer<typeof ParsedTask>} parsedTask - The parsed task
 * @returns {boolean} Whether the task requires flight status checking
 */
export function isFlightStatusTask(parsedTask) {
  return parsedTask.type === TaskTypes.FLIGHT_STATUS;
}

/**
 * Determine if a task requires dealer interaction
 * @param {z.infer<typeof ParsedTask>} parsedTask - The parsed task
 * @returns {boolean} Whether the task requires dealer interaction
 */
export function isDealerInteractionTask(parsedTask) {
  return parsedTask.type === TaskTypes.DEALER_INTERACTION;
}

/**
 * Extract URL from a web crawl task
 * @param {z.infer<typeof ParsedTask>} parsedTask - The parsed task
 * @returns {string|null} The URL to crawl, or null if not found
 */
export function extractUrl(parsedTask) {
  if (isWebCrawlTask(parsedTask) && parsedTask.parameters.url) {
    return parsedTask.parameters.url;
  }
  return null;
}

/**
 * Extract flight information from a flight status task
 * @param {z.infer<typeof ParsedTask>} parsedTask - The parsed task
 * @returns {Object|null} The flight information, or null if not found
 */
export function extractFlightInfo(parsedTask) {
  if (isFlightStatusTask(parsedTask)) {
    return {
      airline: parsedTask.parameters.airline,
      flightNumber: parsedTask.parameters.flightNumber,
      date: parsedTask.parameters.date
    };
  }
  return null;
}

/**
 * Extract dealer information from a dealer interaction task
 * @param {z.infer<typeof ParsedTask>} parsedTask - The parsed task
 * @returns {Object|null} The dealer information, or null if not found
 */
export function extractDealerInfo(parsedTask) {
  if (isDealerInteractionTask(parsedTask)) {
    return {
      dealerId: parsedTask.parameters.dealerId,
      action: parsedTask.parameters.action,
      platform: parsedTask.parameters.platform
    };
  }
  return null;
}

// Default export for the main function
export default parseTask;
