/**
 * Fixed task parser implementation
 * With direct pattern matching for CRM report requests
 */
import { type ParsedTask } from './taskParser';
/**
 * Simple parser function that directly handles VinSolutions CRM report requests
 * without complex logic or LLM calls
 */
export declare function parseTaskDirect(taskText: string): ParsedTask;
