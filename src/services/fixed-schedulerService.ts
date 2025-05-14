/**
 * Fixed Scheduler Service
 *
 * A simplified scheduler implementation that uses native JavaScript setInterval
 * instead of node-cron to avoid "Invalid time value" errors in certain environments.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../shared/db.js';
import { schedules } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { Schedule, ScheduleOptions, ScheduleUpdate, TimerInfo } from '../types/scheduler';

// Store active timers
const activeTimers = new Map<string, TimerInfo>();

/**
 * Parse a cron expression and convert it to milliseconds
 * Supports simplified patterns: "star/n * * * *", "n * * * *", "m h * * *"
 */
function parseCronToMs(cronExpression: string): number {
  // Validate cron expression format
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression format');
  }

  const [minute, hour] = parts;

  // Handle */n pattern (every n minutes)
  if (minute.startsWith('*/')) {
    const n = parseInt(minute.substring(2));
    if (isNaN(n) || n < 1 || n > 59) {
      throw new Error('Invalid minute interval');
    }
    return n * 60 * 1000; // Convert to milliseconds
  }

  // Handle specific minute of every hour
  if (/^\d+$/.test(minute) && hour === '*') {
    const m = parseInt(minute);
    if (m < 0 || m > 59) {
      throw new Error('Invalid minute value');
    }
    return 60 * 60 * 1000; // Run every hour
  }

  // Handle specific time of day
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    const m = parseInt(minute);
    const h = parseInt(hour);
    if (m < 0 || m > 59 || h < 0 || h > 23) {
      throw new Error('Invalid time values');
    }
    return 24 * 60 * 60 * 1000; // Run every day
  }

  throw new Error('Unsupported cron expression pattern');
}

/**
 * Initialize the scheduler by loading enabled schedules from the database
 */
export async function initializeScheduler(): Promise<void> {
  console.log('Initializing scheduler...');

  // Clear any existing timers
  for (const [id, timerInfo] of activeTimers) {
    clearInterval(timerInfo.timer);
    activeTimers.delete(id);
  }

  // Load enabled schedules
  const enabledSchedules = await db.select().from(schedules).where(eq(schedules.enabled, true));

  console.log(`Found ${enabledSchedules.length} enabled schedules`);

  // Set up timer for each enabled schedule
  for (const schedule of enabledSchedules) {
    try {
      const intervalMs = parseCronToMs(schedule.cron);
      const timer = setInterval(async () => {
        await executeSchedule(schedule.id);
      }, intervalMs);

      activeTimers.set(schedule.id, {
        timer,
        workflowId: schedule.workflowId,
        cron: schedule.cron,
      });
    } catch (error) {
      console.error(`Error setting up timer for schedule ${schedule.id}:`, error);
    }
  }
}

/**
 * Execute a scheduled workflow
 */
async function executeSchedule(scheduleId: string): Promise<void> {
  try {
    // Get schedule details
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, scheduleId));

    if (!schedule || !schedule.enabled) {
      // Schedule was disabled or deleted
      const timerInfo = activeTimers.get(scheduleId);
      if (timerInfo) {
        clearInterval(timerInfo.timer);
        activeTimers.delete(scheduleId);
      }
      return;
    }

    // Update last run time
    await db
      .update(schedules)
      .set({
        lastRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, scheduleId));

    // Execute the workflow
    // Note: This should be implemented based on your workflow execution system
    console.log(`Executing scheduled workflow ${schedule.workflowId}`);
  } catch (error) {
    console.error(`Error executing schedule ${scheduleId}:`, error);
  }
}

/**
 * Create a new schedule
 */
export async function createSchedule(
  workflowId: string,
  cronExpression: string,
  options: ScheduleOptions = {}
): Promise<Schedule> {
  // Validate cron expression by attempting to parse it
  const intervalMs = parseCronToMs(cronExpression);

  const scheduleId = uuidv4();
  const now = new Date();

  // Create schedule record
  const [schedule] = await db
    .insert(schedules)
    .values({
      id: scheduleId,
      workflowId,
      cron: cronExpression,
      enabled: options.enabled ?? true,
      description: options.description,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Set up timer if enabled
  if (schedule.enabled) {
    const timer = setInterval(async () => {
      await executeSchedule(scheduleId);
    }, intervalMs);

    activeTimers.set(scheduleId, {
      timer,
      workflowId,
      cron: cronExpression,
    });
  }

  return schedule;
}

/**
 * Get a schedule by ID
 */
export async function getSchedule(id: string): Promise<Schedule | undefined> {
  const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));

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
export async function updateSchedule(id: string, update: ScheduleUpdate): Promise<Schedule> {
  const [existingSchedule] = await db.select().from(schedules).where(eq(schedules.id, id));

  if (!existingSchedule) {
    throw new Error('Schedule not found');
  }

  // Prepare update data
  const updateData: Partial<Schedule> = {
    updatedAt: new Date(),
  };

  if (update.cronExpression) {
    // Validate new cron expression
    parseCronToMs(update.cronExpression);
    updateData.cron = update.cronExpression;
  }

  if (update.description !== undefined) {
    updateData.description = update.description;
  }

  if (update.enabled !== undefined) {
    updateData.enabled = update.enabled;
  }

  // Update the schedule
  const [updatedSchedule] = await db
    .update(schedules)
    .set(updateData)
    .where(eq(schedules.id, id))
    .returning();

  // Update timer if cron expression changed or enabled status changed
  const timerInfo = activeTimers.get(id);
  if (timerInfo) {
    clearInterval(timerInfo.timer);
    activeTimers.delete(id);
  }

  if (updatedSchedule.enabled) {
    const intervalMs = parseCronToMs(updatedSchedule.cron);
    const timer = setInterval(async () => {
      await executeSchedule(id);
    }, intervalMs);

    activeTimers.set(id, {
      timer,
      workflowId: updatedSchedule.workflowId,
      cron: updatedSchedule.cron,
    });
  }

  return updatedSchedule;
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(id: string): Promise<void> {
  // Stop and remove timer
  const timerInfo = activeTimers.get(id);
  if (timerInfo) {
    clearInterval(timerInfo.timer);
    activeTimers.delete(id);
  }

  // Delete schedule from database
  await db.delete(schedules).where(eq(schedules.id, id));
}

/**
 * Get the active timer info for a schedule
 */
export function getActiveTimer(scheduleId: string): TimerInfo | undefined {
  return activeTimers.get(scheduleId);
}
