/**
 * Prompts Module
 *
 * This module exports all prompt-related functionality for the application.
 * It provides a centralized way to access system prompts and prompt routing logic.
 */
export { automotiveAnalystSystemPrompt, promptVersion as automotiveAnalystPromptVersion } from './automotiveAnalystPrompt.js';
export { getPromptByIntent, getPromptTextByIntent, getAvailableIntents, isValidIntent, routerVersion, type PromptIntent, type PromptInfo } from './promptRouter.js';
/**
 * Describes the expected structure of insight responses
 */
export interface InsightResponse {
    title: string;
    description: string;
    actionItems: string[];
    dataPoints?: Record<string, any>;
}
/**
 * Parameters for a generic insight generation request
 */
export interface InsightGenerationParams {
    data: string;
    intent: string;
    dataFormat?: string;
    contextInfo?: Record<string, any>;
}
