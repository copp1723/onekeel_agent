/**
 * Processing Worker for AI Insights
 *
 * Worker implementation for handling insight generation jobs
 * Processes AI insight generation, error handling, and status tracking
 */
import { Job } from 'bullmq';
import { isError } from '../utils/errorUtils';
import logger from '../utils/logger';
import { db } from '../shared/db';
import { taskLogs } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { generateInsightFromReport } from './generateInsightFromReport';

interface InsightJobData {
  taskId: string;
  reportId: string;
  platform: string;
  options?: {
    role?: 'Executive' | 'Sales' | 'Lot';
    saveResults?: boolean;
    evaluateQuality?: boolean;
    assessBusinessImpact?: boolean;
  };
}

/**
 * Initialize the insight processing worker
 */
export function initializeInsightProcessingWorker(): void {
  createWorker(
    QUEUE_NAMES.INSIGHT_PROCESSING,
    async (job: Job) => {
      return await processInsightJob(job);
    },
    {
      concurrency: 3,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 100 }
    }
  );
}

/**
 * Process an insight generation job
 */
export async function processInsightJob(job: Job<InsightJobData>): Promise<any> {
  try {
    logger.info(
      {
        event: 'insight_job_started',
        jobId: job.id,
        jobName: job.name,
        timestamp: new Date().toISOString(),
      },
      `Processing insight job ${job.id} (${job.name})`
    );

    // Extract job data
    const { taskId } = job.data;
    if (!taskId) {
      throw new Error('Job data missing taskId');
    }

    // Update task status
    await db
      .update(taskLogs)
      .set({ status: 'processing' })
      .where(eq(taskLogs.id, taskId.toString()));

    // Generate insights
    const result = await generateInsightFromReport(job.data);

    // Update task status to completed
    await db
      .update(taskLogs)
      .set({ 
        status: 'completed',
        result: JSON.stringify(result),
        completedAt: new Date()
      })
      .where(eq(taskLogs.id, taskId.toString()));

    logger.info(
      {
        event: 'insight_job_completed',
        jobId: job.id,
        jobName: job.name,
        timestamp: new Date().toISOString(),
      },
      `Completed insight job ${job.id} (${job.name})`
    );

    return result;

  } catch (error) {
    // Handle errors
    const errorMessage = isError(error)
      ? error instanceof Error
        ? error.message
        : String(error)
      : String(error);

    logger.error(
      {
        event: 'insight_job_error',
        jobId: job.id,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error processing insight job: ${errorMessage}`
    );

    // Update task status to failed
    if (job.data.taskId) {
      await db
        .update(taskLogs)
        .set({ 
          status: 'failed',
          error: errorMessage,
          completedAt: new Date()
        })
        .where(eq(taskLogs.id, job.data.taskId.toString()));
    }

    throw error;
  }
}