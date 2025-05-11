/**
 * Prompts Module
 *
 * This module exports all prompt-related functionality for the application.
 * It provides a centralized way to access system prompts and prompt routing logic.
 */
// Export specific prompts with their versions
export { automotiveAnalystSystemPrompt, promptVersion as automotiveAnalystPromptVersion } from './automotiveAnalystPrompt.js';
// Export prompt router functionality
export { getPromptByIntent, getPromptTextByIntent, getAvailableIntents, isValidIntent, routerVersion } from './promptRouter.js';
//# sourceMappingURL=index.js.map