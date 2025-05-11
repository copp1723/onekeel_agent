import { Eko, LLMs } from '@eko-ai/eko';
import { EkoTool } from './extractCleanContent.js';

interface SummarizeTextArgs {
  text: string;
  maxLength?: number;
}

/**
 * Creates a summarizeText tool that uses LLM to create concise summaries
 * @param ekoApiKey - The Eko API key to use
 * @returns A tool object that can be registered with Eko
 */
export function summarizeText(ekoApiKey: string): EkoTool {
  return {
    name: 'summarizeText',
    description: 'Creates a concise summary of provided text content',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text content to summarize'
        },
        maxLength: {
          type: 'number',
          description: 'Maximum length of the summary in words (approximate)'
        }
      },
      required: ['text']
    },
    handler: async (args: SummarizeTextArgs) => {
      try {
        const { text, maxLength = 200 } = args;
        
        if (!text || text.trim().length === 0) {
          throw new Error('No text provided to summarize');
        }
        
        // Configure LLMs
        const llms: LLMs = {
          default: {
            provider: "openai",
            model: "gpt-4o-mini",
            apiKey: ekoApiKey,
          }
        };
        
        // Initialize Eko agent
        const eko = new Eko({ llms });
        
        // Define the summarization prompt
        const summarizationPrompt = `
          Your task is to create a concise summary of the following text.
          Keep the summary to approximately ${maxLength} words while capturing the key points.
          
          Text to summarize:
          ${text}
          
          Summary:
        `;
        
        // Generate the summary
        const summary = await eko.run(summarizationPrompt);
        
        return {
          summary: summary.trim(),
          originalLength: text.length,
          summaryLength: summary.trim().length
        };
      } catch (error) {
        console.error('Error summarizing text:', error);
        throw error;
      }
    }
  };
}