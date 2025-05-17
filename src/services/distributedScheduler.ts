import { sql } from 'drizzle-orm';
import { getErrorMessage } from '....js';
import { getErrorMessage } from '....js';
import { isError } from '../utils/errorUtils.js';
/**
 * Distributed Scheduler Service
 *
 * Handles scheduling, execution, and recovery of tasks using BullMQ.
 * This implementation provides:
 * - Persistent schedules stored in the database
 * - Distributed job scheduling with BullMQ
 * - Error handling and automatic retry mechanisms
 * - Status tracking and monitoring capabilities
 */
import { db } from '../shared/db.js';
import { schedules } from '....js';
import { eq, and, lt, sql, sql } from '....js';
import { v4 as uuidv4 } from 'uuid';
import * as cron from 'node-cron';
import logger from '../utils/logger.js';
import {
  initializeQueueManager,
  addJob,
  addRepeatedJob,
  QUEUE_NAMES,
  JOB_TYPES,
} from './queueManager.js';
import { createProcessingTaskLog } from '../workers/processingWorker.js';
import { createIngestionTaskLog } from '../workers/ingestionWorker.js';
import { getErrorMessage, formatError } from '../utils/errorUtils.js';
// Maximum number of retries before marking a schedule as failed
const MAX_RETRIES = 3;
// Type for environment variables needed by schedule execution
export interface EnvVars {
  [key: string]: string | undefined;
}
export interface ScheduleMetadata {
  vendor?: string;
  reportType?: string;
  parameters?: Record<string, unknown>;
}
/**
 * Parse a cron expression and calculate the next run time
 */
function getNextRunTime(cronExpression: string): Date {
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
    // Simple implementation to find the next run time
    // For more complex cases, consider using a dedicated library
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);
    // Add 1 minute to ensure we're looking at the future
    nextDate.setMinutes(nextDate.getMinutes() + 1);
    return nextDate;
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'next_run_time_calculation_error',
        cronExpression,
        errorMessage:
          error instanceof Error
            ? isError(error)
              ? getErrorMessage(error)
              : String(error)
            : String(error),
        timestamp: new Date().toISOString(),
      },
      `Error calculating next run time: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
    );
    // Default to 1 hour from now if parsing fails
    const fallbackDate = new Date();
    fallbackDate.setHours(fallbackDate.getHours() + 1);
    return fallbackDate;
  }
}
/**
 * Initialize the distributed scheduler service
 */
export async function initializeDistributedScheduler(): Promise<void> {
  try {
    logger.info(
      {
        event: 'distributed_scheduler_initializing',
        timestamp: new Date().toISOString(),
      },
      'Initializing distributed scheduler service...'
    );
    // Initialize the queue manager
    await initializeQueueManager();
    // Load all active schedules
    const activeSchedules = await db.select().from(schedules).where(eq(schedules.status, 'active'));
    logger.info(
      {
        event: 'active_schedules_found',
        count: activeSchedules.length,
        timestamp: new Date().toISOString(),
      },
      `Found ${activeSchedules.length} active schedules`
    );
    // Start each schedule
    for (const schedule of activeSchedules) {
      try {
        await startSchedule(schedule.id);
      } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
        // Use type-safe error handling
        const errorMessage = isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error);
        // Use type-safe error handling
        const errorMessage = isError(error)
          ? error instanceof Error
            ? isError(error)
              ? error instanceof Error
                ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
                : String(error)
              : String(error)
            : String(error)
          : String(error);
        logger.error(
          {
            event: 'schedule_start_error',
            scheduleId: schedule.id,
            errorMessage:
              error instanceof Error
                ? isError(error)
                  ? getErrorMessage(error)
                  : String(error)
                : String(error),
            timestamp: new Date().toISOString(),
          },
          `Failed to start schedule ${schedule.id}: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
        );
        // Mark problematic schedules as failed
        await db
          .update(schedules)
          .set({
            status: 'failed',
            updatedAt: new Date(),
            lastError:
              error instanceof Error
                ? error instanceof Error
                  ? error instanceof Error
                    ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                    : String(error)
                  : String(error)
                : String(error),
          })
          .where(eq(schedules.id, schedule.id));
      }
    }
    // Set up periodic check for schedules to execute
    // This serves as a backup mechanism in case BullMQ jobs fail
    setInterval(async () => {
      await checkSchedulesForExecution();
    }, 60000); // Every minute
    logger.info(
      {
        event: 'distributed_scheduler_initialized',
        timestamp: new Date().toISOString(),
      },
      'Distributed scheduler service initialized'
    );
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'distributed_scheduler_init_error',
        errorMessage:
          error instanceof Error
            ? isError(error)
              ? getErrorMessage(error)
              : String(error)
            : String(error),
        timestamp: new Date().toISOString(),
      },
      `Error initializing distributed scheduler: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
    );
    throw error;
  }
}
/**
 * Check for schedules that should be executed based on their nextRunAt time
 */
async function checkSchedulesForExecution(): Promise<void> {
  try {
    const now = new Date();
    // Find schedules that should be running now
    const dueSchedules = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.status, 'active'), lt(schedules.nextRunAt, now)));
    if (dueSchedules.length > 0) {
      logger.info(
        {
          event: 'due_schedules_found',
          count: dueSchedules.length,
          timestamp: new Date().toISOString(),
        },
        `Found ${dueSchedules.length} schedules due for execution`
      );
      for (const schedule of dueSchedules) {
        try {
          // Execute the schedule
          await executeSchedule(schedule.id);
        } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
          // Use type-safe error handling
          const errorMessage = isError(error)
            ? error instanceof Error
              ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
              : String(error)
            : String(error);
          // Use type-safe error handling
          const errorMessage = isError(error)
            ? error instanceof Error
              ? isError(error)
                ? error instanceof Error
                  ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
                  : String(error)
                : String(error)
              : String(error)
            : String(error);
          logger.error(
            {
              event: 'schedule_execution_error',
              scheduleId: schedule.id,
              errorMessage:
                error instanceof Error
                  ? isError(error)
                    ? getErrorMessage(error)
                    : String(error)
                  : String(error),
              timestamp: new Date().toISOString(),
            },
            `Error executing schedule ${schedule.id}: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
          );
        }
      }
    }
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'check_schedules_error',
        errorMessage:
          error instanceof Error
            ? isError(error)
              ? getErrorMessage(error)
              : String(error)
            : String(error),
        timestamp: new Date().toISOString(),
      },
      `Error checking schedules for execution: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
    );
  }
}
/**
 * Create a new schedule
 */
export async function createSchedule(options: {
  userId: string;
  intent: string;
  platform: string;
  cronExpression: string;
  workflowId?: string;
}): Promise<Schedule> {
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
        userId: options.userId!,
        intent: options.intent!,
        platform: options.platform!,
        workflowId: options.workflowId!,
        cron: options.cronExpression,
        nextRunAt,
        status: 'active',
        retryCount: 0,
        enabled: true, // For backward compatibility
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    // Start the schedule
    await startSchedule(newSchedule.id);
    logger.info(
      {
        event: 'schedule_created',
        scheduleId: newSchedule.id,
        platform: options.platform!,
        intent: options.intent!,
        cron: options.cronExpression,
        timestamp: new Date().toISOString(),
      },
      `Created schedule ${newSchedule.id} for ${options.platform!} (${options.intent!})`
    );
    return newSchedule;
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'create_schedule_error',
        options,
        errorMessage:
          error instanceof Error
            ? isError(error)
              ? getErrorMessage(error)
              : String(error)
            : String(error),
        timestamp: new Date().toISOString(),
      },
      `Error creating schedule: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
    );
    throw error;
  }
}
/**
 * Start a schedule by ID
 */
export async function startSchedule(scheduleId: string): Promise<void> {
  try {
    // Get the schedule
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId.toString()));
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    logger.info(
      {
        event: 'schedule_starting',
        scheduleId,
        cron: schedule.cron,
        timestamp: new Date().toISOString(),
      },
      `Starting schedule ${scheduleId} with cron: ${schedule.cron}`
    );
    // Create a task log entry for this schedule
    const taskId = await createProcessingTaskLog(
      JOB_TYPES.SCHEDULED_WORKFLOW,
      {
        scheduleId,
        workflowId: schedule.workflowId!,
        platform: schedule.platform!,
        intent: schedule.intent!,
      },
      schedule.userId!
    );
    // Add a repeatable job to BullMQ
    await addRepeatedJob(
      QUEUE_NAMES.PROCESSING,
      JOB_TYPES.SCHEDULED_WORKFLOW,
      {
        taskId,
        scheduleId,
        workflowId: schedule.workflowId!,
        platform: schedule.platform!,
        intent: schedule.intent!,
      },
      schedule.cron,
      {
        priority: 5, // Higher priority for scheduled jobs
        attempts: MAX_RETRIES,
      }
    );
    // Update the schedule status
    await db
      .update(schedules)
      .set({
        status: 'active',
        nextRunAt: getNextRunTime(schedule.cron),
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, scheduleId.toString()));
    logger.info(
      {
        event: 'schedule_started',
        scheduleId,
        timestamp: new Date().toISOString(),
      },
      `Schedule ${scheduleId} started successfully`
    );
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'start_schedule_error',
        scheduleId,
        errorMessage:
          error instanceof Error
            ? isError(error)
              ? getErrorMessage(error)
              : String(error)
            : String(error),
        timestamp: new Date().toISOString(),
      },
      `Error starting schedule ${scheduleId}: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
    );
    throw error;
  }
}
/**
 * Execute a scheduled task
 */
export async function executeSchedule(scheduleId: string): Promise<void> {
  try {
    // Get the schedule
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId.toString()));
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    logger.info(
      {
        event: 'schedule_executing',
        scheduleId,
        platform: schedule.platform!,
        intent: schedule.intent!,
        timestamp: new Date().toISOString(),
      },
      `Executing schedule ${scheduleId} (${schedule.intent!} for ${schedule.platform!})`
    );
    // Update the last run time
    await db
      .update(schedules)
      .set({
        lastRunAt: new Date(),
        nextRunAt: getNextRunTime(schedule.cron),
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, scheduleId.toString()));
    // Create a task log entry for this execution
    let taskId;
    if (schedule.workflowId!) {
      // For workflow-based schedules
      taskId = await createProcessingTaskLog(
        JOB_TYPES.SCHEDULED_WORKFLOW,
        {
          scheduleId,
          workflowId: schedule.workflowId!,
          platform: schedule.platform!,
          intent: schedule.intent!,
        },
        schedule.userId!
      );
      // Add job to processing queue
      await addJob(
        QUEUE_NAMES.PROCESSING,
        JOB_TYPES.SCHEDULED_WORKFLOW,
        {
          taskId,
          scheduleId,
          workflowId: schedule.workflowId!,
        },
        {
          priority: 5, // Higher priority for scheduled jobs
          attempts: MAX_RETRIES,
        }
      );
    } else {
      // For platform/intent-based schedules (email ingestion)
      taskId = await createIngestionTaskLog(schedule.platform!, schedule.intent!, schedule.userId!);
      // Add job to ingestion queue
      await addJob(
        QUEUE_NAMES.INGESTION,
        JOB_TYPES.EMAIL_INGESTION,
        {
          taskId,
          scheduleId,
          platform: schedule.platform!,
          intent: schedule.intent!,
        },
        {
          priority: 5, // Higher priority for scheduled jobs
          attempts: MAX_RETRIES,
        }
      );
    }
    logger.info(
      {
        event: 'schedule_executed',
        scheduleId,
        taskId,
        timestamp: new Date().toISOString(),
      },
      `Schedule ${scheduleId} execution queued with task ID ${taskId}`
    );
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'execute_schedule_error',
        scheduleId,
        errorMessage:
          error instanceof Error
            ? isError(error)
              ? getErrorMessage(error)
              : String(error)
            : String(error),
        timestamp: new Date().toISOString(),
      },
      `Schedule execution failed ${scheduleId}: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`
    );
    // Handle error and update retry count
    try {
      const [schedule] = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, scheduleId.toString()));
      if (schedule) {
        const newRetryCount = (schedule.retryCount || 0) + 1;
        const status = newRetryCount >= MAX_RETRIES ? 'failed' : 'active';
        await db
          .update(schedules)
          .set({
            retryCount: newRetryCount,
            status,
            lastError:
              error instanceof Error
                ? error instanceof Error
                  ? error instanceof Error
                    ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                    : String(error)
                  : String(error)
                : String(error),
            updatedAt: new Date(),
          })
          .where(eq(schedules.id, scheduleId.toString()));
        if (status === 'failed') {
          logger.warn(
            {
              event: 'schedule_failed',
              scheduleId,
              retryCount: newRetryCount,
              timestamp: new Date().toISOString(),
            },
            `Schedule ${scheduleId} marked as failed after ${newRetryCount} retries`
          );
        }
      }
    } catch (updateError) {
      logger.error(
        {
          event: 'update_retry_count_error',
          scheduleId,
          errorMessage: updateError instanceof Error ? updateError.message : String(updateError),
          timestamp: new Date().toISOString(),
        },
        `Error updating retry count for schedule ${scheduleId}: ${updateError instanceof Error ? updateError.message : String(updateError)}`
      );
    }
    throw error;
  }
}
export async function updateScheduleStatus(id: string, error: unknown): Promise<void> {
  try {
    const errorMessage = getErrorMessage(error);
    await db
      .update(schedules)
      .set({
        status: 'failed',
        retryCount: sql`${schedules.retryCount} + 1`,
        lastError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id.toString()));
    logger.error({
      event: 'schedule_failed',
      scheduleId: id,
      ...formatError(error),
    });
  } catch (dbError) {
    logger.error({
      event: 'update_schedule_status_error',
      scheduleId: id,
      originalError: getErrorMessage(error),
      ...formatError(dbError),
    });
    throw dbError;
  }
}
export async function resetScheduleStatus(id: string): Promise<void> {
  try {
    await db
      .update(schedules)
      .set({
        status: 'active',
        retryCount: 0,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id.toString()));
    logger.info({
      event: 'schedule_reset',
      scheduleId: id,
    });
  } catch (error) {
    logger.error({
      event: 'reset_schedule_status_error',
      scheduleId: id,
      ...formatError(error),
    });
    throw error;
  }
}
export async function updateScheduleRetry(id: string): Promise<void> {
  try {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id.toString()));
    if (!schedule) {
      throw new Error(`Schedule ${id} not found`);
    }
    // Calculate next retry time with exponential backoff
    const retryCount = (schedule.retryCount || 0) + 1;
    const backoffMinutes = Math.min(Math.pow(2, retryCount), 60); // Cap at 60 minutes
    const nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
    await db
      .update(schedules)
      .set({
        retryCount,
        nextRunAt,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id.toString()));
    logger.info({
      event: 'schedule_retry_updated',
      scheduleId: id,
      retryCount,
      nextRunAt,
    });
  } catch (error) {
    logger.error({
      event: 'update_schedule_retry_error',
      scheduleId: id,
      ...formatError(error),
    });
    throw error;
  }
}
export async function getScheduleMetadata(id: string): Promise<ScheduleMetadata | null> {
  try {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id.toString()));
    return (schedule?.metadata as ScheduleMetadata) || null;
  } catch (error) {
    logger.error({
      event: 'get_schedule_metadata_error',
      scheduleId: id,
      ...formatError(error),
    });
    throw error;
  }
}
export async function updateScheduleMetadata(
  id: string,
  metadata: ScheduleMetadata
): Promise<void> {
  try {
    await db
      .update(schedules)
      .set({
        metadata: metadata as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id.toString()));
    logger.info({
      event: 'schedule_metadata_updated',
      scheduleId: id,
      metadata,
    });
  } catch (error) {
    logger.error({
      event: 'update_schedule_metadata_error',
      scheduleId: id,
      ...formatError(error),
    });
    throw error;
  }
}
