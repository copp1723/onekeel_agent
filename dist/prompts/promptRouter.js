/**
 * Prompt Router
 *
 * This module provides a centralized way to select the appropriate system prompt
 * based on the task intent. As more prompt types are added, they can be registered
 * here for easy selection throughout the application.
 */
import { automotiveAnalystSystemPrompt, promptVersion as autoPromptVersion } from './automotiveAnalystPrompt.js';
/**
 * Tracks the version of the prompt router itself
 */
export const routerVersion = 'v1.0.0';
/**
 * Returns the appropriate system prompt based on the specified intent
 * @param intent - The type of analysis or task to be performed
 * @returns The system prompt info including text and version
 * @throws Error if no prompt is defined for the given intent
 */
export function getPromptByIntent(intent) {
    switch (intent) {
        case 'automotive_analysis':
            return {
                text: automotiveAnalystSystemPrompt,
                version: autoPromptVersion,
                intent: 'automotive_analysis'
            };
        default:
            throw new Error(`No prompt defined for intent: ${intent}`);
    }
}
/**
 * Returns just the prompt text for backwards compatibility
 * @param intent - The type of analysis or task to be performed
 * @returns The system prompt text to use with the LLM
 * @throws Error if no prompt is defined for the given intent
 */
export function getPromptTextByIntent(intent) {
    return getPromptByIntent(intent).text;
}
/**
 * Returns all available prompt intents for UI display or validation
 * @returns Array of supported prompt intents
 */
export function getAvailableIntents() {
    return ['automotive_analysis'];
}
/**
 * Validates if a given intent is supported
 * @param intent - The intent to validate
 * @returns True if the intent is supported, false otherwise
 */
export function isValidIntent(intent) {
    return getAvailableIntents().includes(intent);
}
//# sourceMappingURL=promptRouter.js.map