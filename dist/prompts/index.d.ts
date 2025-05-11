/**
 * Prompts Module
 *
 * This module exports all prompt-related functionality for the application.
 * It provides a centralized way to access system prompts and prompt routing logic.
 */
export { automotiveAnalystSystemPrompt } from './automotiveAnalystPrompt.js';
export { getPromptByIntent, getAvailableIntents, isValidIntent, type PromptIntent } from './promptRouter.js';
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
