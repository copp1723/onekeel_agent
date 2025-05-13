/**
 * Simple Scheduler Service
 * A simplified version of the scheduler without node-cron dependency.
 * Uses setInterval for basic periodic scheduling.
 */

import { db } from '../shared/db.js';
import { schedules, taskLogs, type Schedule } from '../shared/schema.js';
import { runWorkflow, getWorkflow } from './workflowService.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { enqueueJob } from './jobQueue.js';

// Map to keep track of active schedules and their intervals
const activeSchedules = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Initialize the scheduler on application startup
 * Loads all enabled schedules from the database and starts them
 */
export async function initializeScheduler(): Promise<void> {
  try {
    console.log('Initializing simple scheduler service...');
    
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
        // Try to start the schedule with the simple scheduler
        await startSchedule(schedule);
      } catch (error) {
        console.error(`Failed to start schedule ${schedule.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        startupErrors.push(`Schedule ${schedule.id}: ${errorMessage}`);
        
        // Disable problematic schedules
        await db
          .update(schedules)
          .set({ 
            enabled: false,
            updatedAt: new Date()
          })
          .where(eq(schedules.id, schedule.id));
      }
    }
    
    if (startupErrors.length > 0) {
      console.warn(`Scheduler initialized with ${startupErrors.length} errors:`, startupErrors);
    } else {
      console.log('Scheduler initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing scheduler:', error);
    throw error;
  }
}

/**
 * Parse numeric interval from cron expression (simplified)
 * This only handles basic interval patterns
 */
function parseIntervalFromCron(cronExpression: string): number {
  try {
    // Default to checking every 5 minutes
    let intervalMinutes = 5;
    
    const parts = cronExpression.trim().split(' ');
    if (parts.length !== 5) {
      console.warn(`Invalid cron expression format: ${cronExpression}, using default 5 minute interval`);
      return intervalMinutes * 60 * 1000;
    }
    
    // Check for */n pattern in minutes field
    const minutesPart = parts[0];
    if (minutesPart.startsWith('*/')) {
      const minutesValue = parseInt(minutesPart.substring(2), 10);
      if (!isNaN(minutesValue) && minutesValue > 0) {
        intervalMinutes = minutesValue;
      }
    } 
    // Check for fixed minute with hour interval (hourly job)
    else if (/^\d+$/.test(minutesPart) && parts[1].startsWith('*/')) {
      const hoursValue = parseInt(parts[1].substring(2), 10);
      if (!isNaN(hoursValue) && hoursValue > 0) {
        intervalMinutes = hoursValue * 60;
      }
    }
    // Daily job at specific time - use 1 day interval
    else if (/^\d+$/.test(minutesPart) && /^\d+$/.test(parts[1]) && parts[2] === '*') {
      intervalMinutes = 24 * 60; // Once per day
    }
    
    console.log(`Parsed cron '${cronExpression}' to interval of ${intervalMinutes} minutes`);
    // Convert to milliseconds
    return intervalMinutes * 60 * 1000;
  } catch (error) {
    console.error(`Error parsing cron expression: ${cronExpression}`, error);
    // Default to 5 minutes
    return 5 * 60 * 1000;
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
 * Start a schedule
 */
export async function startSchedule(schedule: Schedule): Promise<void> {
  try {
    // If the schedule is already active, stop it first
    if (activeSchedules.has(schedule.id)) {
      await stopSchedule(schedule.id);
    }
    
    console.log(`Starting schedule ${schedule.id} with cron: ${schedule.cron}`);
    
    // Parse the interval from the cron expression
    const intervalMs = parseIntervalFromCron(schedule.cron);
    
    // Start an interval to execute the workflow periodically
    const intervalId = setInterval(() => {
      try {
        void executeScheduledWorkflow(schedule);
      } catch (error) {
        console.error(`Error executing scheduled workflow ${schedule.workflowId}:`, error);
      }
    }, intervalMs);
    
    // Store the interval in our active schedules map
    activeSchedules.set(schedule.id, intervalId);
    
    console.log(`Schedule ${schedule.id} started successfully with ${intervalMs}ms interval`);
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
    const interval = activeSchedules.get(scheduleId);
    if (interval) {
      clearInterval(interval);
      activeSchedules.delete(scheduleId);
      console.log(`Schedule ${scheduleId} stopped`);
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
    console.log(`Executing scheduled workflow ${schedule.workflowId}`);
    
    // Update the lastRunAt timestamp
    await db
      .update(schedules)
      .set({ 
        lastRunAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schedules.id, schedule.id));
    
    // Create a task log entry
    const [taskLog] = await db
      .insert(taskLogs)
      .values({
        id: uuidv4(),
        taskType: 'scheduledWorkflow',
        taskText: `Scheduled execution of workflow ${schedule.workflowId}`,
        taskData: { scheduleId: schedule.id, workflowId: schedule.workflowId },
        status: 'pending',
        createdAt: new Date(),
        userId: null // Allow null for system-generated tasks
      })
      .returning();
    
    // Run the workflow directly or enqueue it
    await executeWorkflowById(schedule.workflowId);
    
    console.log(`Scheduled workflow ${schedule.workflowId} executed successfully`);
  } catch (error) {
    console.error(`Error executing scheduled workflow ${schedule.workflowId}:`, error);
    throw error;
  }
}

/**
 * Execute a scheduled workflow directly (called by job processor)
 */
export async function executeWorkflowById(workflowId: string): Promise<void> {
  try {
    await runWorkflow(workflowId);
  } catch (error) {
    console.error(`Error running workflow ${workflowId}:`, error);
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
    const allSchedules = await db
      .select()
      .from(schedules)
      .orderBy(schedules.createdAt);
    
    return allSchedules;
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
    console.error(`Error updating schedule ${scheduleId}:`, error);
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