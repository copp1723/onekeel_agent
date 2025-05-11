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
 * Uses an LLM to parse a natural language task into a structured format
 * @param task - The natural language task description
 * @param ekoApiKey - The Eko API key for the LLM call
 * @returns The parsed task with type and parameters
 */
export declare function parseTask(task: string, ekoApiKey: string): Promise<ParsedTask>;
/**
 * Uses the LLM to parse a task (more advanced implementation)
 * @param task - The natural language task
 * @param ekoApiKey - Eko API key
 * @returns Parsed task
 */
export declare function parseTaskWithLLM(task: string, ekoApiKey: string): Promise<ParsedTask>;
