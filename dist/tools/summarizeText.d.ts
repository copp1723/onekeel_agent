import { EkoTool } from './extractCleanContent.js';
/**
 * Creates a summarizeText tool that uses LLM to create concise summaries
 * @param ekoApiKey - The Eko API key (not used with direct OpenAI integration)
 * @returns A tool object that can be registered with Eko
 */
export declare function summarizeText(_unused: string): EkoTool;
