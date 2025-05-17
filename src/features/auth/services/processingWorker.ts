/**
 * Processing Worker
 *
 * Worker implementation for handling processing jobs
 * Processes report parsing, insight generation, and distribution
 */
import { Job } from 'bullmq';
import { getErrorMessage } from '../../../../utils/errorUtils.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../../../utils/logger.js';
import { db } from '../../../../shared/db.js';
import { taskLogs } from '../../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { createWorker, QUEUE_NAMES, JOB_TYPES } from '../../../../services/bullmqService.js';
import { parseByExtension } from '../../../../services/attachmentParsers.js';
import { storeResults } from '../../../../services/resultsPersistence.js';
import { runWorkflow, getWorkflow } from '../../../../services/workflowService.js';

// Define shared Redis connection options
const redisConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // password: process.env.REDIS_PASSWORD, // Uncomment if needed
};

/**
 * Initialize the processing worker
 */
export function initializeProcessingWorker(): void {
  try {
    // Create worker for processing queue
    createWorker(QUEUE_NAMES.PROCESSING, processProcessingJob, {
      connection: redisConnectionOptions,
      concurrency: parseInt(process.env.PROCESSING_WORKER_CONCURRENCY || '2'),
      limiter: {
        max: 3, // Maximum number of jobs processed in duration
        duration: 1000, // Duration in milliseconds for rate limiting
      },
    });
    logger.info(
      {
        event: 'processing_worker_initialized',
        timestamp: new Date().toISOString(),
      },
      'Processing worker initialized'
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'processing_worker_init_error',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error initializing processing worker: ${errorMessage}`
    );
  }
}

/**
 * Process a processing job
 */
async function processProcessingJob(job: Job): Promise<any> {
  try {
    logger.info(
      {
        event: 'processing_job_started',
        jobId: job.id,
        jobName: job.name,
        timestamp: new Date().toISOString(),
      },
      `Processing job ${job.id} (${job.name})`
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
    // Process job based on job name
    let result;
    switch (job.name) {
      case JOB_TYPES.REPORT_PROCESSING:
        result = await processReport(job.data);
        break;
      case JOB_TYPES.INSIGHT_GENERATION:
        result = await generateInsightFromReport(job.data);
        break;
      case JOB_TYPES.SCHEDULED_WORKFLOW:
        result = await executeScheduledWorkflow(job.data);
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
        event: 'processing_job_completed',
        jobId: job.id,
        jobName: job.name,
        timestamp: new Date().toISOString(),
      },
      `Completed processing job ${job.id} (${job.name})`
    );
    return result;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'processing_job_error',
        jobId: job.id,
        jobName: job.name,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error processing job ${job.id} (${job.name}): ${errorMessage}`
    );
    const { taskId } = job.data;
    if (taskId) {
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
 * Process a report
 */
async function processReport(data: any): Promise<any> {
  try {
    const { reportPath, platform, reportType } = data;
    if (!reportPath) {
      throw new Error('Missing reportPath in job data');
    }
    if (!platform) {
      throw new Error('Missing platform in job data');
    }
    logger.info(
      {
        event: 'report_processing_started',
        reportPath,
        platform,
        reportType,
        timestamp: new Date().toISOString(),
      },
      `Processing report: ${reportPath}`
    );
    // Parse the report
    const parsedData = await parseByExtension(reportPath, {
      vendor: platform,
      reportType: reportType || 'sales_report',
    });
    logger.info(
      {
        event: 'report_parsed',
        reportPath,
        platform,
        recordCount: parsedData.recordCount,
        timestamp: new Date().toISOString(),
      },
      `Parsed ${parsedData.recordCount} records from ${reportPath}`
    );
    // Store results
    const storageResult = await storeResults(platform, parsedData, {
      sourceType: 'email',
      filePath: reportPath,
      metadata: {
        reportType,
        parseTime: Date.now(),
      },
    });
    logger.info(
      {
        event: 'report_results_stored',
        reportPath,
        platform,
        reportId: storageResult.reportId,
        timestamp: new Date().toISOString(),
      },
      `Stored results for ${reportPath} with ID ${storageResult.reportId}`
    );
    return storageResult;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'report_processing_error',
        reportPath: data.reportPath,
        platform: data.platform!,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error processing report: ${errorMessage}`
    );
    throw error;
  }
}

/**
 * Generate insights from a report
 */
async function generateInsightFromReport(data: any): Promise<any> {
  try {
    const { reportId, platform, options = {} } = data;
    if (!reportId) {
      throw new Error('Missing reportId in job data');
    }
    if (!platform) {
      throw new Error('Missing platform in job data');
    }
    logger.info(
      {
        event: 'insight_generation_started',
        reportId,
        platform,
        options,
        timestamp: new Date().toISOString(),
      },
      `Generating insights for report ${reportId}`
    );
    // TODO: Implement insight generation
    // This is a placeholder for the actual implementation
    const insightResult = {
      insightId: uuidv4(),
      timestamp: new Date().toISOString(),
      reportId,
      platform,
      options,
    };
    logger.info(
      {
        event: 'insight_generated',
        reportId,
        platform,
        insightId: insightResult.insightId,
        timestamp: new Date().toISOString(),
      },
      `Generated insights for report ${reportId} with ID ${insightResult.insightId}`
    );
    return insightResult;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'insight_generation_error',
        reportId: data.reportId,
        platform: data.platform!,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error generating insights: ${errorMessage}`
    );
    throw error;
  }
}

/**
 * Execute a scheduled workflow
 */
async function executeScheduledWorkflow(data: any): Promise<any> {
  try {
    const { workflowId } = data;
    if (!workflowId) {
      throw new Error('Missing workflowId in job data');
    }
    logger.info(
      {
        event: 'scheduled_workflow_execution_started',
        workflowId,
        timestamp: new Date().toISOString(),
      },
      `Executing scheduled workflow ${workflowId}`
    );
    // Check if the workflow exists
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    // Skip if the workflow is already running or locked
    if (workflow.status === 'running' || workflow.locked) {
      logger.info(
        {
          event: 'scheduled_workflow_skipped',
          workflowId,
          status: workflow.status,
          locked: workflow.locked,
          timestamp: new Date().toISOString(),
        },
        `Workflow ${workflowId} is already running or locked, skipping execution`
      );
      return {
        workflowId,
        status: 'skipped',
        reason: workflow.status === 'running' ? 'already_running' : 'locked',
      };
    }
    // Run the workflow
    const result = await runWorkflow(workflowId);
    logger.info(
      {
        event: 'scheduled_workflow_executed',
        workflowId,
        status: result.status,
        timestamp: new Date().toISOString(),
      },
      `Executed scheduled workflow ${workflowId} with status ${result.status}`
    );
    // Continue execution if the workflow is paused (multi-step workflow)
    if (result.status === 'paused') {
      logger.info(
        {
          event: 'scheduled_workflow_continue',
          workflowId,
          currentStep: result.currentStep,
          timestamp: new Date().toISOString(),
        },
        `Workflow ${workflowId} is paused, continuing execution`
      );
      const continuedResult = await runWorkflow(workflowId);
      logger.info(
        {
          event: 'scheduled_workflow_continued',
          workflowId,
          status: continuedResult.status,
          timestamp: new Date().toISOString(),
        },
        `Continued scheduled workflow ${workflowId} with status ${continuedResult.status}`
      );
      return continuedResult;
    }
    return result;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'scheduled_workflow_execution_error',
        workflowId: data.workflowId!,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error executing scheduled workflow: ${errorMessage}`
    );
    throw error;
  }
}

/**
 * Create a task log entry for a processing job
 */
export async function createProcessingTaskLog(
  jobType: string,
  jobData: any,
  userId?: string
): Promise<string> {
  try {
    // Generate task ID
    const taskId = uuidv4();
    // Create task log entry
    await db.insert(taskLogs).values({
      id: taskId,
      userId,
      taskType: jobType,
      taskText: `Processing job: ${jobType}`,
      taskData: {
        ...jobData,
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
        event: 'create_processing_task_log_error',
        jobType,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error creating processing task log: ${errorMessage}`
    );
    throw error;
  }
}
