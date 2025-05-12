/**
 * Step Handlers for Workflow Execution
 * Each handler implements a specific step type for workflow execution
 */
import { WorkflowStepType } from '../shared/schema.js';
/**
 * Generic type for step handlers
 */
export type StepHandler = (config: Record<string, any>, context: Record<string, any>) => Promise<any>;
/**
 * Maps step types to their handler functions
 */
export declare const stepHandlers: Record<WorkflowStepType, StepHandler>;
