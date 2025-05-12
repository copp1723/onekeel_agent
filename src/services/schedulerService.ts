/**
 * Scheduler Service
 * Manages and executes scheduled workflows based on cron expressions
 */

import { db } from '../shared/db.js';
import { schedules, taskLogs, type Schedule } from '../shared/schema.js';
import { runWorkflow, getWorkflow } from './workflowService.js';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { enqueueJob } from './jobQueue.js';

// Map to keep track of active schedules and their node-cron tasks
const activeSchedules = new Map<string, ReturnType<typeof cron.schedule>>();

/**
 * Initialize the scheduler on application startup
 * Loads all enabled schedules from the database and starts them
 */
export async function initializeScheduler(): Promise<void> {
  try {
    console.log('Initializing scheduler service...');
    
    // Load all enabled schedules
    const enabledSchedules = await db
      .select()
      .from(schedules)
      .where(eq(schedules.enabled, true));
    
    console.log(`Found ${enabledSchedules.length} enabled schedules`);
    
    // Start each schedule
    for (const schedule of enabledSchedules) {
      await startSchedule(schedule);
    }
    
    console.log('Scheduler initialized successfully');
  } catch (error) {
    console.error('Error initializing scheduler:', error);
    throw error;
  }
}

/**
 * Create a new schedule for a workflow
 */
export async function createSchedule(
  workflowId: string,
  cronExpression: string,
  enabled: boolean = true
): Promise<Schedule> {
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
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
}

/**
 * Get a schedule by ID
 */
export async function getSchedule(scheduleId: string): Promise<Schedule | undefined> {
  try {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));
    
    return schedule;
  } catch (error) {
    console.error('Error getting schedule:', error);
    throw error;
  }
}

/**
 * List all schedules
 */
export async function listSchedules(): Promise<Schedule[]> {
  try {
    return await db
      .select()
      .from(schedules)
      .orderBy(schedules.createdAt);
  } catch (error) {
    console.error('Error listing schedules:', error);
    throw error;
  }
}

/**
 * Update a schedule
 */
export async function updateSchedule(
  scheduleId: string,
  updates: {
    cronExpression?: string;
    enabled?: boolean;
  }
): Promise<Schedule | undefined> {
  try {
    // Get the current schedule
    const currentSchedule = await getSchedule(scheduleId);
    if (!currentSchedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    
    // Prepare updates
    const updateValues: Partial<Schedule> = {
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
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<boolean> {
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
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
}

/**
 * Start a schedule
 */
export async function startSchedule(schedule: Schedule): Promise<void> {
  try {
    // If the schedule is already active, stop it first
    if (activeSchedules.has(schedule.id)) {
      await stopSchedule(schedule.id);
    }
    
    console.log(`Starting schedule ${schedule.id} with cron: ${schedule.cron}`);
    
    // Create a node-cron task
    const task = cron.schedule(schedule.cron, async () => {
      await executeScheduledWorkflow(schedule);
    });
    
    // Store the task in our active schedules map
    activeSchedules.set(schedule.id, task);
    
    console.log(`Schedule ${schedule.id} started successfully`);
  } catch (error) {
    console.error(`Error starting schedule ${schedule.id}:`, error);
    throw error;
  }
}

/**
 * Stop a schedule
 */
export async function stopSchedule(scheduleId: string): Promise<void> {
  try {
    const task = activeSchedules.get(scheduleId);
    if (task) {
      console.log(`Stopping schedule ${scheduleId}`);
      task.stop();
      activeSchedules.delete(scheduleId);
      console.log(`Schedule ${scheduleId} stopped successfully`);
    }
  } catch (error) {
    console.error(`Error stopping schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Execute a scheduled workflow
 */
async function executeScheduledWorkflow(schedule: Schedule): Promise<void> {
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
    
    // Enqueue the job with the task ID
    await enqueueJob(taskId, 5); // Priority 5 for scheduled jobs
    
    console.log(`Scheduled workflow ${schedule.workflowId} execution queued`);
  } catch (error) {
    console.error(`Error executing scheduled workflow ${schedule.workflowId}:`, error);
    // We don't throw here to prevent the scheduler from stopping on errors
  }
}

/**
 * Execute a scheduled workflow directly (called by job processor)
 */
export async function executeWorkflowById(workflowId: string): Promise<void> {
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
  } catch (error) {
    console.error(`Error executing workflow ${workflowId}:`, error);
    throw error;
  }
}