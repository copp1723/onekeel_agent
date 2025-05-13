/**
 * Simple Scheduler Service
 * A simplified version of the scheduler without node-cron dependency.
 * Uses setInterval for basic periodic scheduling.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../shared/db.js';
import { schedules, workflows } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { runWorkflow } from './workflowService.js';

// Store active schedule timers
const activeSchedules = new Map<string, NodeJS.Timeout>();

// Schedule type
export interface Schedule {
  id: string;
  workflowId: string | null;
  cron: string;  // DB field is 'cron', not 'cronExpression'
  enabled: boolean;
  description?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  lastRunAt?: Date | null;  // DB field is 'lastRunAt', not 'lastRun'
  nextRunAt?: Date | null;  // Used for tracking next run time
  userId?: string;
}

/**
 * Initialize the scheduler on application startup
 * Loads all enabled schedules from the database and starts them
 */
export async function initializeScheduler(): Promise<void> {
  console.log('Initializing scheduler service (simple version)...');
  
  try {
    // Clean up any active timers
    activeSchedules.forEach((timer, scheduleId) => {
      stopSchedule(scheduleId);
    });
    
    // Load all enabled schedules
    const enabledSchedules = await db
      .select()
      .from(schedules)
      .where(eq(schedules.enabled, true));
    
    console.log(`Found ${enabledSchedules.length} enabled schedules`);
    
    // Start each schedule
    for (const schedule of enabledSchedules) {
      try {
        await startSchedule(schedule);
      } catch (error) {
        console.error(`Error starting schedule ${schedule.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error initializing scheduler:', error);
  }
}

/**
 * Parse interval from cron expression (simplified)
 * This only handles basic interval patterns
 */
function parseIntervalFromCron(cronExpression: string): number {
  try {
    // Simplified cron parsing - only supports basic intervals
    // Format: */n * * * * for every n minutes
    const minuteMatch = cronExpression.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (minuteMatch) {
      const minutes = parseInt(minuteMatch[1], 10);
      return minutes * 60 * 1000; // Convert to milliseconds
    }
    
    // Every hour at minute x: x * * * *
    const hourlyMatch = cronExpression.match(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (hourlyMatch) {
      return 60 * 60 * 1000; // 1 hour in milliseconds
    }
    
    // Every day at specific time: m h * * *
    const dailyMatch = cronExpression.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
    if (dailyMatch) {
      return 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }
    
    // Default: every hour
    return 60 * 60 * 1000;
  } catch (error) {
    console.error('Error parsing cron expression:', cronExpression, error);
    // Default fallback: every hour
    return 60 * 60 * 1000;
  }
}

/**
 * Create a new schedule for a workflow
 */
export async function createSchedule(
  workflowId: string,
  cronExpression: string,
  options: {
    enabled?: boolean;
    description?: string;
    tags?: string[];
    userId?: string;
  } = {}
): Promise<Schedule> {
  try {
    // Validate the workflow exists
    const workflow = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow || workflow.length === 0) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }
    
    // Create and save schedule
    const id = uuidv4();
    const now = new Date();
    
    // Note: In the database schema, the field is 'cron' not 'cronExpression'
    const [schedule] = await db
      .insert(schedules)
      .values({
        id,
        workflowId,
        cron: cronExpression,  // DB field is 'cron'
        enabled: options.enabled !== false, // Default to true
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    // Start the schedule if enabled
    if (schedule.enabled) {
      await startSchedule(schedule);
    }
    
    return schedule;
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
    // Stop any existing timer
    if (activeSchedules.has(schedule.id)) {
      stopSchedule(schedule.id);
    }
    
    // Parse the interval from cron expression
    const interval = parseIntervalFromCron(schedule.cron);
    
    // Create a new timer
    const timer = setInterval(async () => {
      await executeScheduledWorkflow(schedule);
    }, interval);
    
    // Store active timer
    activeSchedules.set(schedule.id, timer);
    
    // Calculate next run time
    const nextRunAt = new Date(Date.now() + interval);
    
    // Update the next run time in the database
    await db
      .update(schedules)
      .set({
        updatedAt: new Date(),
        // Note: nextRunAt is not in the schema, so we won't store it
        // But we'll log it for debugging purposes
      })
      .where(eq(schedules.id, schedule.id));
    
    console.log(`Started schedule ${schedule.id} with interval ${interval}ms, next run at ${nextRunAt.toISOString()}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error starting schedule ${schedule.id}:`, error);
    throw new Error(`Error starting schedule: ${errorMessage}`);
  }
}

/**
 * Stop a schedule
 */
export async function stopSchedule(scheduleId: string): Promise<void> {
  const timer = activeSchedules.get(scheduleId);
  if (timer) {
    clearInterval(timer);
    activeSchedules.delete(scheduleId);
    console.log(`Stopped schedule ${scheduleId}`);
  }
}

/**
 * Execute a scheduled workflow
 */
async function executeScheduledWorkflow(schedule: Schedule): Promise<void> {
  try {
    if (!schedule.workflowId) {
      console.error('Cannot execute schedule without workflowId:', schedule);
      return;
    }
    
    console.log(`Executing scheduled workflow ${schedule.workflowId}`);
    
    // Update lastRunAt time
    await db
      .update(schedules)
      .set({
        lastRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, schedule.id));
    
    // Execute the workflow
    await executeWorkflowById(schedule.workflowId);
    
  } catch (error) {
    console.error(`Error executing scheduled workflow ${schedule.workflowId}:`, error);
  }
}

/**
 * Execute a scheduled workflow directly (called by job processor)
 */
export async function executeWorkflowById(workflowId: string): Promise<void> {
  try {
    // Get the workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }
    
    // Reset the workflow for re-execution
    await db
      .update(workflows)
      .set({
        status: 'pending',
        currentStep: 0,
        lastUpdated: new Date(),
      })
      .where(eq(workflows.id, workflowId));
    
    // Run the workflow
    await runWorkflow(workflowId);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing workflow ${workflowId}:`, error);
    throw new Error(`Failed to execute workflow: ${errorMessage}`);
  }
}

/**
 * Get a schedule by ID
 */
export async function getSchedule(scheduleId: string): Promise<Schedule | undefined> {
  const [schedule] = await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId));
  
  return schedule;
}

/**
 * List all schedules
 */
export async function listSchedules(): Promise<Schedule[]> {
  return db.select().from(schedules);
}

/**
 * Update a schedule
 */
export async function updateSchedule(
  scheduleId: string,
  updates: {
    cronExpression?: string;  // API uses cronExpression for clarity
    enabled?: boolean;
    description?: string;
    tags?: string[];
  }
): Promise<Schedule> {
  try {
    // Get the current schedule
    const [currentSchedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));
    
    if (!currentSchedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }
    
    // Prepare the database update object
    const dbUpdates: any = {
      updatedAt: new Date(),
    };
    
    // Map cronExpression to cron (the DB field name)
    if (updates.cronExpression) {
      dbUpdates.cron = updates.cronExpression;
    }
    
    if (updates.enabled !== undefined) {
      dbUpdates.enabled = updates.enabled;
    }
    
    // Update the schedule
    const [updatedSchedule] = await db
      .update(schedules)
      .set(dbUpdates)
      .where(eq(schedules.id, scheduleId))
      .returning();
    
    // If the cron expression changed or it was enabled/disabled, restart or stop
    if (
      (updates.cronExpression && updates.cronExpression !== currentSchedule.cron) ||
      updates.enabled !== undefined
    ) {
      if (updatedSchedule.enabled) {
        await startSchedule(updatedSchedule);
      } else {
        await stopSchedule(scheduleId);
      }
    }
    
    return updatedSchedule;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error updating schedule ${scheduleId}:`, error);
    throw new Error(`Failed to update schedule: ${errorMessage}`);
  }
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<boolean> {
  try {
    // Stop the schedule if it's running
    await stopSchedule(scheduleId);
    
    // Delete from the database
    const result = await db
      .delete(schedules)
      .where(eq(schedules.id, scheduleId));
    
    // Check if something was deleted
    return true; // If we get here, it worked
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error deleting schedule ${scheduleId}:`, error);
    throw new Error(`Failed to delete schedule: ${errorMessage}`);
  }
}