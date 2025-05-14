/**
 * Fixed Workflow Manager Service
 * 
 * This service provides workflow execution functionality without database dependencies
 * for testing purposes. This is a simplified version that works in memory.
 */
import { v4 as uuidv4 } from 'uuid';
import { isError } from '../utils/errorUtils.js';
import { Workflow, WorkflowConfig, WorkflowExecutionResult, StepExecutionResult } from '../types/workflow.js';
import logger from '../utils/logger.js';
// In-memory storage for workflows
const workflows = new Map<string, Workflow>();
/**
 * Workflow Manager Class
 * Handles workflow registration, execution, and management
 */
class WorkflowManager {
  /**
   * Register a new workflow
   * @param workflowConfig - Workflow configuration
   * @returns Workflow ID
   */
  async registerWorkflow(workflowConfig: WorkflowConfig): Promise<string> {
    const id = uuidv4();
    workflows.set(id, { 
      ...workflowConfig,
      id,
      currentStep: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return id;
  }
  /**
   * Get a workflow by ID
   * @param id - Workflow ID
   * @returns Workflow data
   */
  async getWorkflow(id: string): Promise<Workflow | undefined> {
    return workflows.get(id);
  }
  /**
   * Execute a specific step in a workflow
   * @param id - Workflow ID
   * @param stepIndex - Step index to execute
   * @param context - Context data for execution
   * @returns Step execution result
   */
  async executeWorkflowStep(id: string, stepIndex: number, context: Record<string, any> = {}): Promise<StepExecutionResult> {
    const workflow = workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }
    if (stepIndex >= workflow.steps.length) {
      throw new Error(`Step index out of bounds: ${stepIndex}`);
    }
    const step = workflow.steps[stepIndex];
    try {
      // Execute the step handler
      const result = await step.handler(context);
      // Update workflow status
      workflow.currentStep = stepIndex + 1;
      workflow.status = stepIndex === workflow.steps.length - 1 ? 'completed' : 'paused';
      workflow.updatedAt = new Date().toISOString();
      // Store updated workflow
      workflows.set(id, workflow);
      return {
        success: true,
        ...result
      };
    } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      const errorMessage = error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : 'Unknown error';
      const stack = error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined;
      logger.error({ 
        event: 'workflow_step_error', 
        workflowId: id, 
        stepIndex, 
        errorMessage, 
        stack, 
        timestamp: new Date().toISOString() 
      }, 'Error executing workflow step');
      // Update workflow status to error
      workflow.status = 'error';
      workflow.error = errorMessage;
      workflow.updatedAt = new Date().toISOString();
      // Store updated workflow
      workflows.set(id, workflow);
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  /**
   * Execute an entire workflow from start to finish
   * @param id - Workflow ID
   * @param initialContext - Initial context data
   * @returns Final workflow context
   */
  async executeWorkflow(id: string, initialContext: Record<string, any> = {}): Promise<WorkflowExecutionResult> {
    const workflow = workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }
    let context = { ...initialContext };
    for (let i = 0; i < workflow.steps.length; i++) {
      const result = await this.executeWorkflowStep(id, i, context);
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          completedSteps: i
        };
      }
      // Update context with step result
      context = {
        ...context,
        [`${workflow.steps[i].id}`]: result,
        __lastStepResult: result
      };
    }
    return {
      success: true,
      context
    };
  }
  /**
   * Delete a workflow
   * @param id - Workflow ID
   * @returns Success status
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    return workflows.delete(id);
  }
  /**
   * List all workflows
   * @returns List of workflows
   */
  async listWorkflows(): Promise<Workflow[]> {
    return Array.from(workflows.values());
  }
  /**
   * Reset a workflow to its initial state
   * @param id - Workflow ID
   * @returns Updated workflow status
   */
  async resetWorkflow(id: string): Promise<Pick<Workflow, 'currentStep' | 'status'>> {
    const workflow = workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }
    workflow.currentStep = 0;
    workflow.status = 'pending';
    workflow.updatedAt = new Date().toISOString();
    workflows.set(id, workflow);
    return {
      currentStep: workflow.currentStep,
      status: workflow.status
    };
  }
}
// Create and export a singleton instance
export const workflowManager = new WorkflowManager();