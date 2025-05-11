import { ExecutionPlan } from '../agent/executePlan.js';
import { TaskType } from '../types.js';
export interface ParsedTask {
    type: TaskType;
    parameters: Record<string, any>;
    original: string;
    plan?: ExecutionPlan;
    error?: string;
    planId?: string;
}
/**
 * Parses a natural language task into a structured format using rule-based patterns
 * @param task - The natural language task description
 * @param _ekoApiKey - The Eko API key (unused in this implementation, but kept for API compatibility)
 * @returns The parsed task with type and parameters
 */
export declare function parseTask(task: string, _ekoApiKey: string): Promise<ParsedTask>;
/**
 * Uses the LLM to parse a task (more advanced implementation)
 * @param task - The natural language task
 * @param ekoApiKey - Eko API key
 * @returns Parsed task
 */
export declare function parseTaskWithLLM(task: string, ekoApiKey: string): Promise<ParsedTask>;
