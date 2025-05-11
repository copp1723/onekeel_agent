import { ExecutionPlan } from '../agent/executePlan.js';
export declare enum TaskType {
    WebCrawling = "web_crawling",
    WebContentExtraction = "web_content_extraction",
    SummarizeText = "summarize_text",
    FlightStatus = "flight_status",
    DealerLogin = "dealer_login",
    VehicleData = "vehicle_data",
    FetchCRMReport = "fetch_crm_report",
    MultiStep = "multi_step",
    Unknown = "unknown"
}
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
