/**
 * Workflow Service
 * Handles multi-step workflows with memory, state transitions, and resumability
 */
import { db } from '../shared/db.js';
import { workflows } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
// Import step handlers
import { stepHandlers } from './stepHandlers.js';
/**
 * Create a new workflow
 */
export async function createWorkflow(steps, initialContext = {}, userId) {
    try {
        // Validate steps
        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            throw new Error('Workflow must have at least one step');
        }
        // Make sure each step has a unique ID
        const stepsWithIds = steps.map(step => ({
            ...step,
            id: step.id || uuidv4()
        }));
        // Create the workflow
        const [workflow] = await db.insert(workflows).values({
            userId,
            steps: stepsWithIds,
            currentStep: 0,
            context: initialContext,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        console.log(`Created workflow ${workflow.id} with ${stepsWithIds.length} steps`);
        return workflow;
    }
    catch (error) {
        console.error('Error creating workflow:', error);
        throw error;
    }
}
/**
 * Run a workflow step
 */
export async function runWorkflow(workflowId) {
    try {
        // Get the workflow
        const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        // Check if workflow is already locked
        if (workflow.locked) {
            const lockedTime = workflow.lockedAt ? new Date(workflow.lockedAt).getTime() : 0;
            const currentTime = new Date().getTime();
            // If locked for more than 5 minutes, consider it stale and continue
            if (currentTime - lockedTime < 5 * 60 * 1000) {
                throw new Error(`Workflow ${workflowId} is currently locked`);
            }
        }
        // If workflow is completed or failed, don't run again
        if (workflow.status === 'completed' || workflow.status === 'failed') {
            return workflow;
        }
        // Lock the workflow
        const [updatedWorkflow] = await db.update(workflows)
            .set({
            locked: true,
            lockedAt: new Date(),
            status: 'running',
            updatedAt: new Date(),
        })
            .where(and(eq(workflows.id, workflowId), eq(workflows.locked, false)))
            .returning();
        // If we couldn't update (lock), another process might be running this
        if (!updatedWorkflow) {
            throw new Error(`Could not lock workflow ${workflowId} for execution`);
        }
        // Parse the steps as JSON
        const steps = Array.isArray(updatedWorkflow.steps) ?
            updatedWorkflow.steps :
            JSON.parse(updatedWorkflow.steps);
        // Execute the current step
        const currentStepIndex = updatedWorkflow.currentStep;
        if (currentStepIndex >= steps.length) {
            // Mark as completed if all steps are done
            const [finalWorkflow] = await db.update(workflows)
                .set({
                status: 'completed',
                locked: false,
                updatedAt: new Date(),
            })
                .where(eq(workflows.id, workflowId))
                .returning();
            return finalWorkflow;
        }
        const currentStep = steps[currentStepIndex];
        try {
            // Get the handler for this step type
            const handler = stepHandlers[currentStep.type];
            if (!handler) {
                throw new Error(`No handler found for step type ${currentStep.type}`);
            }
            console.log(`Executing step ${currentStepIndex + 1}/${steps.length}: ${currentStep.name}`);
            // Execute the step
            const stepResult = await handler(currentStep.config, updatedWorkflow.context);
            // Merge the step result into the context
            const newContext = {
                ...updatedWorkflow.context,
                [currentStep.id]: stepResult,
                __lastStepResult: stepResult // Store the last step result for easy access
            };
            // Update the workflow
            const [newWorkflow] = await db.update(workflows)
                .set({
                currentStep: currentStepIndex + 1,
                context: newContext,
                status: currentStepIndex + 1 >= steps.length ? 'completed' : 'paused',
                locked: false,
                updatedAt: new Date(),
                lastUpdated: new Date(),
            })
                .where(eq(workflows.id, workflowId))
                .returning();
            return newWorkflow;
        }
        catch (error) {
            // Handle step error
            console.error(`Error executing step ${currentStepIndex + 1}/${steps.length}:`, error);
            // Determine if we should retry the step
            let shouldRetry = false;
            let retryBackoff = 0;
            if (currentStep.maxRetries && currentStep.retries !== undefined) {
                if (currentStep.retries < currentStep.maxRetries) {
                    shouldRetry = true;
                    // Calculate exponential backoff if specified
                    if (currentStep.backoffFactor) {
                        retryBackoff = Math.pow(currentStep.backoffFactor, currentStep.retries) * 1000;
                    }
                    // Update retry count in the steps
                    steps[currentStepIndex].retries = (currentStep.retries || 0) + 1;
                }
            }
            // Update the workflow with error information
            const [failedWorkflow] = await db.update(workflows)
                .set({
                steps: steps,
                status: shouldRetry ? 'paused' : 'failed',
                lastError: error instanceof Error ? error.message : String(error),
                locked: false,
                updatedAt: new Date(),
                lastUpdated: new Date(),
                ...(shouldRetry && retryBackoff > 0 ? { lockedAt: new Date(Date.now() + retryBackoff) } : {})
            })
                .where(eq(workflows.id, workflowId))
                .returning();
            return failedWorkflow;
        }
    }
    catch (error) {
        console.error('Error running workflow:', error);
        // Ensure we unlock the workflow in case of error
        try {
            await db.update(workflows)
                .set({
                locked: false,
                lastError: error instanceof Error ? error.message : String(error),
                updatedAt: new Date(),
            })
                .where(eq(workflows.id, workflowId));
        }
        catch (unlockError) {
            console.error('Error unlocking workflow:', unlockError);
        }
        throw error;
    }
}
/**
 * Get a workflow by ID
 */
export async function getWorkflow(workflowId) {
    try {
        const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
        return workflow || null;
    }
    catch (error) {
        console.error('Error getting workflow:', error);
        throw error;
    }
}
/**
 * List workflows with optional filtering
 */
export async function listWorkflows(status, userId, limit = 100) {
    try {
        let query = db.select().from(workflows);
        if (status) {
            query = query.where(eq(workflows.status, status));
        }
        if (userId) {
            query = query.where(eq(workflows.userId, userId));
        }
        return query.limit(limit);
    }
    catch (error) {
        console.error('Error listing workflows:', error);
        throw error;
    }
}
/**
 * Reset a workflow to its initial state
 */
export async function resetWorkflow(workflowId) {
    try {
        const [workflow] = await db.update(workflows)
            .set({
            currentStep: 0,
            status: 'pending',
            lastError: null,
            locked: false,
            updatedAt: new Date(),
        })
            .where(eq(workflows.id, workflowId))
            .returning();
        return workflow;
    }
    catch (error) {
        console.error('Error resetting workflow:', error);
        throw error;
    }
}
/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId) {
    try {
        const result = await db.delete(workflows).where(eq(workflows.id, workflowId));
        return true;
    }
    catch (error) {
        console.error('Error deleting workflow:', error);
        throw error;
    }
}
//# sourceMappingURL=workflowService.js.map