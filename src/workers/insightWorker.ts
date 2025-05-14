/**
 * Insight Worker
 *
 * Worker implementation for handling insight generation jobs
 * Processes report analysis, insight generation, and distribution
 */
import { Job } from 'bullmq';
import { isError } from '../utils/errorUtils';
import logger from '../utils/logger';
import { createWorker, QUEUE_NAMES } from '../services/bullmqService';
import { processInsightJob } from './insightProcessingWorker';

/**
 * Initialize the insight worker
 */
export function initializeInsightWorker(): void {
  try {
    // Create worker for insight queue
    createWorker(QUEUE_NAMES.INSIGHT, processInsightJob, {
      concurrency: parseInt(process.env.INSIGHT_WORKER_CONCURRENCY || '2'),
      limiter: {
        max: 2, // Maximum number of insight jobs processed in duration
        duration: 1000, // Duration in milliseconds for rate limiting
      },
    });
    
    logger.info(
      {
        event: 'insight_worker_initialized',
        timestamp: new Date().toISOString(),
      },
      'Insight worker initialized'
    );
  } catch (error) {
    const errorMessage = isError(error)
      ? error instanceof Error
        ? error.message
        : String(error)
      : String(error);

    logger.error(
      {
        event: 'insight_worker_init_error',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error initializing insight worker: ${errorMessage}`
    );
  }
}