/**
 * Scheduler Service
 * Manages and executes scheduled workflows based on cron expressions
 */
import { db } from '../shared/db.js';
import { schedules, taskLogs } from '../shared/schema.js';
import { runWorkflow, getWorkflow } from './workflowService.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { enqueueJob } from './jobQueue.js';
// Map to keep track of active schedules and their node-cron tasks
const activeSchedules = new Map();
/**
 * Initialize the scheduler on application startup
 * Loads all enabled schedules from the database and starts them
 */
export async function initializeScheduler() {
    try {
        console.log('Initializing scheduler service...');
        // Load all enabled schedules
        const enabledSchedules = await db
            .select()
            .from(schedules)
            .where(eq(schedules.enabled, true));
        console.log(`Found ${enabledSchedules.length} enabled schedules`);
        // Start each schedule with proper error handling
        const startupErrors = [];
        for (const schedule of enabledSchedules) {
            try {
                // Validate the cron expression before attempting to start
                if (!cron.validate(schedule.cron)) {
                    console.error(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cron}`);
                    // Disable invalid schedules
                    await db
                        .update(schedules)
                        .set({
                        enabled: false,
                        updatedAt: new Date()
                    })
                        .where(eq(schedules.id, schedule.id));
                    startupErrors.push(`Schedule ${schedule.id}: Invalid cron expression`);
                    continue;
                }
                // Try to start the schedule
                await startSchedule(schedule);
            }
            catch (error) {
                console.error(`Failed to start schedule ${schedule.id}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                startupErrors.push(`Schedule ${schedule.id}: ${errorMessage}`);
                // Continue with other schedules even if this one fails
            }
        }
        if (startupErrors.length > 0) {
            console.warn(`Scheduler initialized with ${startupErrors.length} errors:`, startupErrors);
        }
        else {
            console.log('Scheduler initialized successfully');
        }
    }
    catch (error) {
        console.error('Error initializing scheduler:', error);
        throw error;
    }
}
/**
 * Create a new schedule for a workflow
 */
export async function createSchedule(workflowId, cronExpression, enabled = true) {
    try {
        // Validate the cron expression
        if (!cron.validate(cronExpression)) {
            throw new Error(`Invalid cron expression: ${cronExpression}`);
        }
        // Validate that the workflow exists
        const workflow = await getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        // Create the schedule
        const [newSchedule] = await db
            .insert(schedules)
            .values({
            id: uuidv4(),
            workflowId,
            cron: cronExpression,
            enabled,
            createdAt: new Date(),
            updatedAt: new Date()
        })
            .returning();
        // If the schedule is enabled, start it right away
        if (enabled) {
            await startSchedule(newSchedule);
        }
        return newSchedule;
    }
    catch (error) {
        console.error('Error creating schedule:', error);
        throw error;
    }
}
/**
 * Get a schedule by ID
 */
export async function getSchedule(scheduleId) {
    try {
        const [schedule] = await db
            .select()
            .from(schedules)
            .where(eq(schedules.id, scheduleId));
        return schedule;
    }
    catch (error) {
        console.error('Error getting schedule:', error);
        throw error;
    }
}
/**
 * List all schedules
 */
export async function listSchedules() {
    try {
        return await db
            .select()
            .from(schedules)
            .orderBy(schedules.createdAt);
    }
    catch (error) {
        console.error('Error listing schedules:', error);
        throw error;
    }
}
/**
 * Update a schedule
 */
export async function updateSchedule(scheduleId, updates) {
    try {
        // Get the current schedule
        const currentSchedule = await getSchedule(scheduleId);
        if (!currentSchedule) {
            throw new Error(`Schedule not found: ${scheduleId}`);
        }
        // Prepare updates
        const updateValues = {
            updatedAt: new Date()
        };
        if (updates.cronExpression) {
            // Validate the new cron expression
            if (!cron.validate(updates.cronExpression)) {
                throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
            }
            updateValues.cron = updates.cronExpression;
        }
        if (updates.enabled !== undefined) {
            updateValues.enabled = updates.enabled;
        }
        // Update the schedule in the database
        const [updatedSchedule] = await db
            .update(schedules)
            .set(updateValues)
            .where(eq(schedules.id, scheduleId))
            .returning();
        if (!updatedSchedule) {
            throw new Error(`Failed to update schedule: ${scheduleId}`);
        }
        // Stop the existing schedule if it's active
        if (activeSchedules.has(scheduleId)) {
            await stopSchedule(scheduleId);
        }
        // Start the schedule if it's enabled
        if (updatedSchedule.enabled) {
            await startSchedule(updatedSchedule);
        }
        return updatedSchedule;
    }
    catch (error) {
        console.error('Error updating schedule:', error);
        throw error;
    }
}
/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId) {
    try {
        // Stop the schedule if it's active
        if (activeSchedules.has(scheduleId)) {
            await stopSchedule(scheduleId);
        }
        // Delete the schedule from the database
        const [deletedSchedule] = await db
            .delete(schedules)
            .where(eq(schedules.id, scheduleId))
            .returning();
        return !!deletedSchedule;
    }
    catch (error) {
        console.error('Error deleting schedule:', error);
        throw error;
    }
}
/**
 * Start a schedule
 */
export async function startSchedule(schedule) {
    try {
        // If the schedule is already active, stop it first
        if (activeSchedules.has(schedule.id)) {
            await stopSchedule(schedule.id);
        }
        console.log(`Starting schedule ${schedule.id} with cron: ${schedule.cron}`);
        // Create a node-cron task with proper error handling and timezone configuration
        try {
            // Configure with UTC timezone to avoid timezone-related errors
            const options = {
                scheduled: true,
                timezone: "UTC"
            };
            const task = cron.schedule(schedule.cron, async () => {
                try {
                    await executeScheduledWorkflow(schedule);
                }
                catch (executionError) {
                    console.error(`Error executing scheduled workflow ${schedule.workflowId}:`, executionError);
                    // Log error but don't kill the scheduler
                }
            }, options);
            // Store the task in our active schedules map
            activeSchedules.set(schedule.id, task);
            console.log(`Schedule ${schedule.id} started successfully`);
        }
        catch (cronError) {
            console.error(`Failed to create cron job for schedule ${schedule.id}:`, cronError);
            // Update the schedule to be disabled due to invalid cron expression
            await db
                .update(schedules)
                .set({
                enabled: false,
                updatedAt: new Date()
            })
                .where(eq(schedules.id, schedule.id));
            throw new Error(`Invalid cron expression or time value: ${schedule.cron}`);
        }
    }
    catch (error) {
        console.error(`Error starting schedule ${schedule.id}:`, error);
        throw error;
    }
}
/**
 * Stop a schedule
 */
export async function stopSchedule(scheduleId) {
    try {
        const task = activeSchedules.get(scheduleId);
        if (task) {
            console.log(`Stopping schedule ${scheduleId}`);
            task.stop();
            activeSchedules.delete(scheduleId);
            console.log(`Schedule ${scheduleId} stopped successfully`);
        }
    }
    catch (error) {
        console.error(`Error stopping schedule ${scheduleId}:`, error);
        throw error;
    }
}
/**
 * Execute a scheduled workflow
 */
async function executeScheduledWorkflow(schedule) {
    try {
        console.log(`Executing scheduled workflow ${schedule.workflowId} from schedule ${schedule.id}`);
        // Update the lastRunAt timestamp
        await db
            .update(schedules)
            .set({
            lastRunAt: new Date(),
            updatedAt: new Date()
        })
            .where(eq(schedules.id, schedule.id));
        // Execute the workflow using the job queue for better reliability
        // Create a task log entry for this scheduled run
        const taskId = uuidv4();
        // Create a task log entry
        try {
            await db.insert(taskLogs).values({
                id: taskId,
                taskType: 'scheduledWorkflow',
                taskText: `Run scheduled workflow: ${schedule.workflowId}`,
                taskData: {
                    scheduleId: schedule.id,
                    workflowId: schedule.workflowId,
                    cron: schedule.cron
                },
                status: 'pending',
                createdAt: new Date()
            });
        }
        catch (insertError) {
            // If there was an error with the insert, try a different approach
            console.log('Error inserting task log, trying alternative approach:', insertError);
            // Try with user_id if that's what's missing (detected from logs)
            try {
                await db.insert(taskLogs).values({
                    id: taskId,
                    taskType: 'scheduledWorkflow',
                    taskText: `Run scheduled workflow: ${schedule.workflowId}`,
                    taskData: {
                        scheduleId: schedule.id,
                        workflowId: schedule.workflowId,
                        cron: schedule.cron
                    },
                    status: 'pending',
                    createdAt: new Date(),
                    // Add user_id if schema requires it
                    userId: 'system-scheduler'
                });
            }
            catch (secondError) {
                console.error('Second attempt at inserting task log failed:', secondError);
                throw secondError; // Re-throw the error to be caught by the outer catch
            }
        }
        // Enqueue the job with the task ID
        await enqueueJob(taskId, 5); // Priority 5 for scheduled jobs
        console.log(`Scheduled workflow ${schedule.workflowId} execution queued`);
    }
    catch (error) {
        console.error(`Error executing scheduled workflow ${schedule.workflowId}:`, error);
        // We don't throw here to prevent the scheduler from stopping on errors
    }
}
/**
 * Execute a scheduled workflow directly (called by job processor)
 */
export async function executeWorkflowById(workflowId) {
    try {
        // Check if the workflow is already running
        const workflow = await getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        // Skip if the workflow is already running or locked
        if (workflow.status === 'running' || workflow.locked) {
            console.log(`Workflow ${workflowId} is already running or locked, skipping execution`);
            return;
        }
        // Run the workflow
        const result = await runWorkflow(workflowId);
        console.log(`Scheduled workflow ${workflowId} executed with status: ${result.status}`);
        // Continue execution if the workflow is paused (multi-step workflow)
        if (result.status === 'paused') {
            console.log(`Workflow ${workflowId} is paused at step ${result.currentStep}, continuing execution`);
            await runWorkflow(workflowId);
        }
    }
    catch (error) {
        console.error(`Error executing workflow ${workflowId}:`, error);
        throw error;
    }
}
//# sourceMappingURL=schedulerService.js.map