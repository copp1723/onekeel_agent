/**
 * Fixed Workflow Manager Service
 * 
 * This service provides workflow execution functionality without database dependencies
 * for testing purposes. This is a simplified version that works in memory.
 */

import { v4 as uuidv4 } from 'uuid';
const logger = require('../utils/logger').default;

// In-memory storage for workflows
const workflows = new Map();

/**
 * Workflow Manager Class
 * Handles workflow registration, execution, and management
 */
class WorkflowManager {
  /**
   * Register a new workflow
   * @param {Object} workflowConfig - Workflow configuration
   * @returns {String} - Workflow ID
   */
  async registerWorkflow(workflowConfig) {
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
   * @param {String} id - Workflow ID
   * @returns {Object} - Workflow data
   */
  async getWorkflow(id) {
    return workflows.get(id);
  }

  /**
   * Execute a specific step in a workflow
   * @param {String} id - Workflow ID
   * @param {Number} stepIndex - Step index to execute
   * @param {Object} context - Context data for execution
   * @returns {Object} - Step execution result
   */
  async executeWorkflowStep(id, stepIndex, context = {}) {
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
      
      return result;
    } catch (error) {
      logger.error({ event: 'workflow_step_error', workflowId: id, stepIndex, errorMessage: error.message, stack: error.stack, timestamp: new Date().toISOString() }, `Error executing workflow step`);
      
      // Update workflow status to error
      workflow.status = 'error';
      workflow.error = error.message;
      workflow.updatedAt = new Date().toISOString();
      
      // Store updated workflow
      workflows.set(id, workflow);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute an entire workflow from start to finish
   * @param {String} id - Workflow ID
   * @param {Object} initialContext - Initial context data
   * @returns {Object} - Final workflow context
   */
  async executeWorkflow(id, initialContext = {}) {
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
   * @param {String} id - Workflow ID
   * @returns {Boolean} - Success status
   */
  async deleteWorkflow(id) {
    return workflows.delete(id);
  }

  /**
   * List all workflows
   * @returns {Array} - List of workflows
   */
  async listWorkflows() {
    return Array.from(workflows.values());
  }

  /**
   * Reset a workflow to its initial state
   * @param {String} id - Workflow ID
   * @returns {Object} - Updated workflow
   */
  async resetWorkflow(id) {
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