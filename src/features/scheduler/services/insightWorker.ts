/**
 * Insight Worker
 *
 * Worker implementation for handling insight generation jobs
 * Processes report analysis, insight generation, and distribution
 */
import { getErrorMessage } from '../../../../utils/errorUtils.js';
import logger from '../../../../utils/logger.js';
import { createWorker } from '../../../../services/bullmqService.js';
import { QUEUE_NAMES } from '../../../../shared/constants.js';
import { processInsightJob } from './insightProcessingWorker.js';

// Define shared Redis connection options
const redisConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // password: process.env.REDIS_PASSWORD, // Uncomment if needed
};

/**
 * Initialize the insight worker
 */
export function initializeInsightWorker(): void {
  try {
    // Create worker for insight queue
    createWorker(QUEUE_NAMES.INSIGHT, processInsightJob, {
      connection: redisConnectionOptions,
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
    const errorMessage = getErrorMessage(error);
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