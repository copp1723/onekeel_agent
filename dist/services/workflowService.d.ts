import { WorkflowStatus, WorkflowStep, Workflow } from '../shared/schema.js';
/**
 * Create a new workflow
 */
export declare function createWorkflow(steps: WorkflowStep[], initialContext?: Record<string, any>, userId?: string): Promise<Workflow>;
/**
 * Run a workflow step
 */
export declare function runWorkflow(workflowId: string): Promise<Workflow>;
/**
 * Get a workflow by ID
 */
export declare function getWorkflow(workflowId: string): Promise<Workflow | null>;
/**
 * List workflows with optional filtering
 */
export declare function listWorkflows(status?: WorkflowStatus, userId?: string, limit?: number): Promise<Workflow[]>;
/**
 * Reset a workflow to its initial state
 */
export declare function resetWorkflow(workflowId: string): Promise<Workflow>;
/**
 * Delete a workflow
 */
export declare function deleteWorkflow(workflowId: string): Promise<boolean>;
/**
 * Configure email notifications for a workflow
 * @param workflowId The ID of the workflow
 * @param emails A single email address or array of email addresses
 * @returns The updated workflow
 */
export declare function configureWorkflowNotifications(workflowId: string, emails: string | string[]): Promise<Workflow>;
