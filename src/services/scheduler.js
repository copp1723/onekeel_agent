/**
 * Enhanced Scheduler Service
 *
 * Handles scheduling, execution, and recovery of tasks using the hybrid ingestion flow.
 * This implementation provides:
 * - Persistent schedules stored in the database
 * - Cron-based scheduling with proper next run calculation
 * - Error handling and automatic retry mechanisms
 * - Status tracking and monitoring capabilities
 */

import { db } from '../shared/db.js';
import { schedules } from '../shared/schema.js';
import { emailIngestAndRunFlow } from '../agents/hybridIngestAndRunFlow.js';
import { generateInsightsForPlatform } from '../services/enhancedInsightGenerator.js';
import { distributeInsights } from '../services/insightDistributionService.js';
import { eq, and, lt, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';

// Maximum number of retries before marking a schedule as failed
const MAX_RETRIES = 3;

// Map of schedule IDs to their cron jobs
const activeJobs = new Map();

/**
 * Parse a cron expression and calculate the next run time
 */
function getNextRunTime(cronExpression) {
  try {
    // Validate the cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Calculate the next occurrence
    const interval = cron.schedule(cronExpression, () => {});
    interval.stop();

    // Get the next date that matches the cron expression
    const now = new Date();
    let nextDate = new Date(now);

    // Parse cron fields
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      throw new Error(`Invalid cron format: ${cronExpression}`);
    }

    // Use simple approximation for next run based on cron parts
    const minute = parts[0];
    const hour = parts[1];
    const dayOfMonth = parts[2];
    const month = parts[3];

    // For simple cases, make a reasonable guess
    if (minute.includes('*/')) {
      // Every n minutes
      const interval = parseInt(minute.replace('*/', ''), 10);
      nextDate.setMinutes(nextDate.getMinutes() + interval);
      nextDate.setSeconds(0);
      nextDate.setMilliseconds(0);
    } else if (minute !== '*' && hour !== '*') {
      // Specific time each day
      const minuteVal = parseInt(minute, 10);
      const hourVal = parseInt(hour, 10);

      nextDate.setHours(hourVal);
      nextDate.setMinutes(minuteVal);
      nextDate.setSeconds(0);
      nextDate.setMilliseconds(0);

      // If the time has already passed today, move to tomorrow
      if (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
    } else {
      // For more complex expressions, add a default interval
      nextDate.setHours(nextDate.getHours() + 1);
    }

    return nextDate;
  } catch (error) {
    console.error('Error calculating next run time:', error);
    // Default to 1 hour from now if parsing fails
    const fallbackDate = new Date();
    fallbackDate.setHours(fallbackDate.getHours() + 1);
    return fallbackDate;
  }
}

/**
 * Initialize the scheduler service
 * Loads all active schedules from the database and starts them
 */
export async function initializeScheduler() {
  try {
    console.log('Initializing enhanced scheduler service...');

    // Load all active schedules
    const activeSchedules = await db
      .select()
      .from(schedules)
      .where(eq(schedules.status, 'active'));

    console.log(`Found ${activeSchedules.length} active schedules`);

    // Start each schedule
    for (const schedule of activeSchedules) {
      try {
        await startSchedule(schedule.id);
      } catch (error) {
        console.error(`Failed to start schedule ${schedule.id}:`, error);

        // Mark problematic schedules as failed
        await db
          .update(schedules)
          .set({
            status: 'failed',
            updatedAt: new Date(),
            lastError: error instanceof Error ? error.message : String(error)
          })
          .where(eq(schedules.id, schedule.id));
      }
    }

    // Set up periodic check for schedules to execute
    // This serves as a backup mechanism in case cron jobs fail
    setInterval(async () => {
      await checkSchedulesForExecution();
    }, 60000); // Every minute

    console.log('Scheduler initialization completed');
  } catch (error) {
    console.error('Error initializing scheduler:', error);
    throw error;
  }
}

/**
 * Check for schedules that should be executed based on their nextRunAt time
 */
async function checkSchedulesForExecution() {
  try {
    const now = new Date();

    // Find schedules that should be running now
    const dueSchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.status, 'active'),
          lt(schedules.nextRunAt, now)
        )
      );

    if (dueSchedules.length > 0) {
      console.log(`Found ${dueSchedules.length} schedules due for execution`);

      for (const schedule of dueSchedules) {
        try {
          // Execute the schedule
          await executeSchedule(schedule.id);
        } catch (error) {
          console.error(`Error executing schedule ${schedule.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking schedules for execution:', error);
  }
}

/**
 * Create a new schedule
 */
export async function createSchedule(options) {
  try {
    // Validate the cron expression
    if (!cron.validate(options.cronExpression)) {
      throw new Error(`Invalid cron expression: ${options.cronExpression}`);
    }

    // Calculate the next run time
    const nextRunAt = getNextRunTime(options.cronExpression);

    // Create the schedule
    const [newSchedule] = await db
      .insert(schedules)
      .values({
        id: uuidv4(),
        userId: options.userId,
        intent: options.intent,
        platform: options.platform,
        workflowId: options.workflowId,
        cron: options.cronExpression,
        nextRunAt,
        status: 'active',
        retryCount: 0,
        enabled: true, // For backward compatibility
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Start the schedule
    await startSchedule(newSchedule.id);

    return newSchedule;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
}

/**
 * Start a schedule by ID
 */
export async function startSchedule(scheduleId) {
  try {
    // Get the schedule
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Cancel any existing job
    stopSchedule(scheduleId);

    // Set up the cron job
    const job = cron.schedule(schedule.cron, async () => {
      try {
        await executeSchedule(scheduleId);
      } catch (error) {
        console.error(`Error executing scheduled job ${scheduleId}:`, error);
      }
    });

    // Store the job reference
    activeJobs.set(scheduleId, job);

    // Update the schedule status
    await db
      .update(schedules)
      .set({
        status: 'active',
        nextRunAt: getNextRunTime(schedule.cron),
        updatedAt: new Date()
      })
      .where(eq(schedules.id, scheduleId));

    console.log(`Schedule ${scheduleId} started successfully`);
  } catch (error) {
    console.error(`Error starting schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Stop a schedule by ID
 */
export async function stopSchedule(scheduleId) {
  try {
    // Get the active job
    const job = activeJobs.get(scheduleId);

    if (job) {
      // Stop the job
      job.stop();
      activeJobs.delete(scheduleId);
    }

    console.log(`Schedule ${scheduleId} stopped`);
  } catch (error) {
    console.error(`Error stopping schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Execute a scheduled task
 */
export async function executeSchedule(scheduleId) {
  try {
    // Get the schedule
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    console.log(`Executing schedule ${scheduleId} (${schedule.intent} for ${schedule.platform})`);

    // Update the last run time
    await db
      .update(schedules)
      .set({
        lastRunAt: new Date(),
        nextRunAt: getNextRunTime(schedule.cron),
        updatedAt: new Date()
      })
      .where(eq(schedules.id, scheduleId));

    // Execute the task based on platform and intent
    let result;

    // Collect necessary environment variables
    const envVars = {
      DOWNLOAD_DIR: process.env.DOWNLOAD_DIR || './downloads',
      VIN_SOLUTIONS_USERNAME: process.env.VIN_SOLUTIONS_USERNAME,
      VIN_SOLUTIONS_PASSWORD: process.env.VIN_SOLUTIONS_PASSWORD,
      VAUTO_USERNAME: process.env.VAUTO_USERNAME,
      VAUTO_PASSWORD: process.env.VAUTO_PASSWORD,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      EMAIL_HOST: process.env.EMAIL_HOST,
      OTP_EMAIL_USER: process.env.OTP_EMAIL_USER,
      OTP_EMAIL_PASS: process.env.OTP_EMAIL_PASS
    };

    try {
      // Use email-only ingestion to fetch the report
      const filePath = await emailIngestAndRunFlow(schedule.platform, envVars);

      // Generate insights from the fetched report
      const insights = await generateInsightsForPlatform(
        schedule.platform,
        filePath,
        { intent: schedule.intent }
      );

      // Distribute insights to stakeholders
      await distributeInsights(insights, schedule.platform);

      // Reset retry count on success
      await db
        .update(schedules)
        .set({
          retryCount: 0,
          updatedAt: new Date()
        })
        .where(eq(schedules.id, scheduleId));

      console.log(`Schedule ${scheduleId} executed successfully`);
    } catch (error) {
      console.error(`Error executing schedule ${scheduleId}:`, error);

      // Increment retry count
      const newRetryCount = (schedule.retryCount || 0) + 1;
      const status = newRetryCount >= MAX_RETRIES ? 'failed' : 'active';

      // Update the schedule with error information
      await db
        .update(schedules)
        .set({
          retryCount: newRetryCount,
          status,
          lastError: error instanceof Error ? error.message : String(error),
          updatedAt: new Date()
        })
        .where(eq(schedules.id, scheduleId));

      if (status === 'failed') {
        // Stop the schedule if max retries exceeded
        stopSchedule(scheduleId);
      } else if (newRetryCount < MAX_RETRIES) {
        // Optional: immediate retry with exponential backoff
        const backoffTime = Math.pow(2, newRetryCount) * 1000; // 2^n seconds
        console.log(`Will retry schedule ${scheduleId} in ${backoffTime / 1000} seconds`);

        setTimeout(async () => {
          try {
            await executeSchedule(scheduleId);
          } catch (retryError) {
            console.error(`Error during retry of schedule ${scheduleId}:`, retryError);
          }
        }, backoffTime);
      }

      throw error;
    }
  } catch (error) {
    console.error(`Schedule execution failed ${scheduleId}:`, error);
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
  } catch (error) {
    console.error(`Error getting schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * List schedules with filtering options
 */
export async function listSchedules(options = {}) {
  try {
    // Build query conditions
    const conditions = [];

    if (options.userId) {
      conditions.push(eq(schedules.userId, options.userId));
    }

    if (options.status) {
      conditions.push(eq(schedules.status, options.status));
    }

    if (options.platform) {
      conditions.push(eq(schedules.platform, options.platform));
    }

    if (options.intent) {
      conditions.push(eq(schedules.intent, options.intent));
    }

    if (options.active !== undefined) {
      conditions.push(eq(schedules.status, 'active'));
    }

    // Execute the query
    let query = db.select().from(schedules);

    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(schedules.createdAt);
  } catch (error) {
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
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Prepare updates
    const updateValues = {
      updatedAt: new Date()
    };

    if (updates.cronExpression) {
      // Validate the cron expression
      if (!cron.validate(updates.cronExpression)) {
        throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
      }

      updateValues.cron = updates.cronExpression;
      updateValues.nextRunAt = getNextRunTime(updates.cronExpression);
    }

    if (updates.status) {
      updateValues.status = updates.status;
    }

    if (updates.intent) {
      updateValues.intent = updates.intent;
    }

    if (updates.platform) {
      updateValues.platform = updates.platform;
    }

    // Update the schedule
    const [updatedSchedule] = await db
      .update(schedules)
      .set(updateValues)
      .where(eq(schedules.id, scheduleId))
      .returning();

    if (!updatedSchedule) {
      throw new Error(`Failed to update schedule: ${scheduleId}`);
    }

    // Handle status transitions
    if (updates.status || updates.cronExpression) {
      if (updatedSchedule.status === 'active') {
        // Start or restart the schedule
        await startSchedule(scheduleId);
      } else {
        // Stop the schedule
        await stopSchedule(scheduleId);
      }
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
export async function deleteSchedule(scheduleId) {
  try {
    // Stop the schedule if running
    await stopSchedule(scheduleId);

    // Delete from database
    const [deletedSchedule] = await db
      .delete(schedules)
      .where(eq(schedules.id, scheduleId))
      .returning();

    return !!deletedSchedule;
  } catch (error) {
    console.error(`Error deleting schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Retry a failed schedule
 */
export async function retrySchedule(scheduleId) {
  try {
    // Get the schedule
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Update the schedule status and retry count
    const [updatedSchedule] = await db
      .update(schedules)
      .set({
        status: 'active',
        retryCount: 0,
        updatedAt: new Date(),
        nextRunAt: new Date() // Schedule for immediate execution
      })
      .where(eq(schedules.id, scheduleId))
      .returning();

    // Start the schedule
    await startSchedule(scheduleId);

    // Optionally, execute immediately
    await executeSchedule(scheduleId);

    return updatedSchedule;
  } catch (error) {
    console.error(`Error retrying schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Get schedule run logs
 * This is a placeholder that should be replaced with actual implementation
 * once a schedule_runs table is created
 */
export async function getScheduleLogs(scheduleId) {
  // This is a placeholder until we implement the schedule_runs table
  console.log(`Getting logs for schedule ${scheduleId}`);
  return [];
}