import { EkoTool } from '../tools/extractCleanContent.js';
export interface PlanStep {
    tool: string;
    input: Record<string, any>;
}
export interface ExecutionPlan {
    steps: PlanStep[];
    planId?: string;
    taskText?: string;
}
export interface StepResult {
    output: any;
    error?: string;
    stepId?: string;
}
/**
 * Executes a multi-step plan by running each tool in sequence
 * and passing outputs between steps as needed
 *
 * @param plan - The execution plan with steps to run
 * @param tools - Map of available tools by name
 * @returns The result of the final step or all step results
 */
export declare function executePlan(plan: ExecutionPlan, tools: Record<string, EkoTool>): Promise<{
    finalOutput: any;
    stepResults: StepResult[];
    planId: string;
}>;
