/**
 * Ingestion Worker
 *
 * Worker implementation for handling ingestion jobs
 * Processes email ingestion, report fetching, and data extraction
 */
import { Job } from 'bullmq';
import { getErrorMessage, isError } from '../utils/errorUtils.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { db } from '../shared/db.js';
import { taskLogs } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { createWorker, QUEUE_NAMES, JOB_TYPES } from '../services/bullmqService.js';
import { emailIngestAndRunFlow } from '../agents/emailIngestAndRunFlow.js';
import { EnvVars } from '../types.js';

// Define shared Redis connection options
const redisConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // password: process.env.REDIS_PASSWORD, // Uncomment if needed
};

/**
 * Initialize the ingestion worker
 */
export function initializeIngestionWorker(): void {
  try {
    // Create worker for ingestion queue
    createWorker(QUEUE_NAMES.INGESTION, processIngestionJob, {
      connection: redisConnectionOptions,
      concurrency: parseInt(process.env.INGESTION_WORKER_CONCURRENCY || '3'),
      limiter: {
        max: 5, // Maximum number of jobs processed in duration
        duration: 1000, // Duration in milliseconds for rate limiting
      },
    });
    logger.info(
      {
        event: 'ingestion_worker_initialized',
        timestamp: new Date().toISOString(),
      },
      'Ingestion worker initialized'
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'ingestion_worker_init_error',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error initializing ingestion worker: ${errorMessage}`
    );
  }
}
/**
 * Process an ingestion job
 */
async function processIngestionJob(job: Job): Promise<any> {
  try {
    logger.info(
      {
        event: 'ingestion_job_started',
        jobId: job.id,
        jobName: job.name,
        timestamp: new Date().toISOString(),
      },
      `Processing ingestion job ${job.id} (${job.name})`
    );
    // Extract job data
    const { taskId, platform, intent, options } = job.data;
    if (!taskId) {
      throw new Error('Job data missing taskId');
    }
    if (!platform) {
      throw new Error('Job data missing platform');
    }
    // Update task status
    await db
      .update(taskLogs)
      .set({ status: 'processing' })
      .where(eq(taskLogs.id, taskId.toString()));
    // Process job based on job name
    let result;
    switch (job.name) {
      case JOB_TYPES.EMAIL_INGESTION:
        result = await processEmailIngestion(platform, intent, options);
        break;
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
    // Update task status
    await db
      .update(taskLogs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        result,
      })
      .where(eq(taskLogs.id, taskId.toString()));
    logger.info(
      {
        event: 'ingestion_job_completed',
        jobId: job.id,
        jobName: job.name,
        timestamp: new Date().toISOString(),
      },
      `Completed ingestion job ${job.id} (${job.name})`
    );
    return result;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'ingestion_job_error',
        jobId: job.id,
        jobName: job.name,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error processing ingestion job ${job.id} (${job.name}): ${errorMessage}`
    );
    // Extract task ID from job data
    const { taskId } = job.data;
    if (taskId) {
      // Update task status
      await db
        .update(taskLogs)
        .set({
          status: 'failed',
          error: errorMessage,
        })
        .where(eq(taskLogs.id, taskId.toString()));
    }
    throw error;
  }
}
/**
 * Process email ingestion
 */
async function processEmailIngestion(
  platform: string,
  intent?: string,
  options?: any
): Promise<any> {
  try {
    logger.info(
      {
        event: 'email_ingestion_started',
        platform,
        intent,
        timestamp: new Date().toISOString(),
      },
      `Starting email ingestion for ${platform}${intent ? ` (${intent})` : ''}`
    );
    // Get environment variables
    const envVars: EnvVars = {
      EMAIL_USER: process.env.EMAIL_USER || '',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
      EMAIL_HOST: process.env.EMAIL_HOST || '',
      EMAIL_PORT: process.env.EMAIL_PORT || '993', // keep as string
      EMAIL_TLS: (process.env.EMAIL_TLS !== 'false').toString(), // string
      DOWNLOAD_DIR: process.env.DOWNLOAD_DIR || './downloads',
    };
    // Build options object with exactOptionalPropertyTypes compliance
    const flowOptions: { intent?: string; skipInsights?: boolean } = {
      skipInsights: options?.skipInsights || false,
    };
    if (intent !== undefined) {
      flowOptions.intent = intent;
    }
    // Run email ingestion flow
    const result = await emailIngestAndRunFlow(platform, envVars, logger, flowOptions);
    logger.info(
      {
        event: 'email_ingestion_completed',
        platform,
        intent,
        reportId: result.reportId,
        timestamp: new Date().toISOString(),
      },
      `Completed email ingestion for ${platform}${intent ? ` (${intent})` : ''}`
    );
    return result;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'email_ingestion_error',
        platform,
        intent,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error processing email ingestion for ${platform}${intent ? ` (${intent})` : ''}: ${errorMessage}`
    );
    throw error;
  }
}
/**
 * Create a task log entry for an ingestion job
 */
export async function createIngestionTaskLog(
  platform: string,
  intent?: string,
  userId?: string
): Promise<string> {
  try {
    // Generate task ID
    const taskId = uuidv4();
    // Create task log entry
    await db.insert(taskLogs).values({
      id: taskId,
      userId,
      taskType: 'email_ingestion',
      taskText: `Email ingestion for ${platform}${intent ? ` (${intent})` : ''}`,
      taskData: {
        platform,
        intent,
        timestamp: new Date().toISOString(),
      },
      status: 'pending',
      createdAt: new Date(),
    });
    return taskId;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'create_ingestion_task_log_error',
        platform,
        intent,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error creating ingestion task log: ${errorMessage}`
    );
    throw error;
  }
}
