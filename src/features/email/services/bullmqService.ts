/**
 * BullMQ Service
 *
 * Core implementation of BullMQ for distributed job processing
 * Provides a unified interface for creating queues, workers, and schedulers
 */
import { Queue, Worker, QueueScheduler, Job, WorkerOptions } from 'bullmq';
import {  getErrorMessage } from '../../../../utils/errorUtils.js';
import {  getErrorMessage } from '....js';
import { isError } from '../../../../utils/errorUtils.js';
import { RedisOptions } from 'ioredis';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../../../utils/logger.js';
import { db } from '../../../../shared/db.js';
import { jobs } from '../../../../shared/schema.js';
import { eq } from 'drizzle-orm';
/**
 * Error handling utility
 */
function getTypeSafeError(error: unknown): string {
  return isError(error)
    ? error instanceof Error
      ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
      : String(error)
    : String(error);
}
// Define queue names
export const QUEUE_NAMES = {
  INGESTION: 'ingestion',
  PROCESSING: 'processing',
  EMAIL: 'email',
  INSIGHT: 'insight',
};
// Define job types
export const JOB_TYPES = {
  EMAIL_INGESTION: 'email_ingestion',
  REPORT_PROCESSING: 'report_processing',
  INSIGHT_GENERATION: 'insight_generation',
  INSIGHT_DISTRIBUTION: 'insight_distribution',
  SCHEDULED_WORKFLOW: 'scheduled_workflow'
};
// Redis connection options
const defaultRedisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
};
// Default job options
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000, // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
};
// Queue instances
const queues: Record<string, Queue> = {};
const workers: Record<string, Worker> = {};
const schedulers: Record<string, QueueScheduler> = {};
// Redis client
let redisClient: IORedis | null = null;
// In-memory mode flag
let inMemoryMode = false;
/**
 * Initialize the Redis connection
 */
export async function initializeRedis(options: RedisOptions = {}): Promise<IORedis | null> {
  try {
    // Check if we want to force in-memory mode
    if (process.env.FORCE_IN_MEMORY_QUEUE === 'true') {
      throw new Error('Forcing in-memory queue mode');
    }
    // Merge default options with provided options
    const redisOptions = { ...defaultRedisOptions, ...options };
    logger.info(
      {
        event: 'redis_connect_attempt',
        host: redisOptions.host,
        port: redisOptions.port,
        timestamp: new Date().toISOString(),
      },
      `Attempting to connect to Redis at ${redisOptions.host}:${redisOptions.port}...`
    );
    // Create Redis client
    redisClient = new IORedis(redisOptions);
    // Handle connection errors
    redisClient.on('error', (err) => {
      if (!inMemoryMode) {
        logger.error(
          {
            event: 'redis_connection_error',
            errorMessage: err.message,
            timestamp: new Date().toISOString(),
          },
          `Redis connection error: ${err.message}`
        );
      }
    });
    // Test connection
    await redisClient.ping();
    inMemoryMode = false;
    logger.info(
      {
        event: 'redis_connected',
        timestamp: new Date().toISOString(),
      },
      'Successfully connected to Redis'
    );
    return redisClient;
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getTypeSafeError(error);
    // Fall back to in-memory mode
    inMemoryMode = true;
    logger.warn(
      {
        event: 'redis_connection_failed',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      'Redis connection failed, using in-memory job queue'
    );
    return null;
  }
}
/**
 * Create a queue
 */
export function createQueue(name: string, options: QueueOptions = {}): Queue | null {
  try {
    if (inMemoryMode) {
      logger.info(
        {
          event: 'queue_create_skipped',
          queueName: name,
          timestamp: new Date().toISOString(),
        },
        `Skipping queue creation for ${name} in in-memory mode`
      );
      return null;
    }
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    // Create queue with connection
    const queue = new Queue(name, {
      connection: redisClient,
      ...options,
    });
    // Store queue instance
    queues[name] = queue;
    logger.info(
      {
        event: 'queue_created',
        queueName: name,
        timestamp: new Date().toISOString(),
      },
      `Created queue: ${name}`
    );
    return queue;
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getTypeSafeError(error);
    logger.error(
      {
        event: 'queue_create_error',
        queueName: name,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error creating queue ${name}: ${errorMessage}`
    );
    return null;
  }
}
/**
 * Create a worker
 */
export function createWorker(
  queueName: string,
  processor: (job: Job) => Promise<any>,
  options: WorkerOptions = {}
): Worker | null {
  try {
    if (inMemoryMode) {
      logger.info(
        {
          event: 'worker_create_skipped',
          queueName,
          timestamp: new Date().toISOString(),
        },
        `Skipping worker creation for ${queueName} in in-memory mode`
      );
      return null;
    }
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    // Create worker with connection
    const worker = new Worker(queueName, processor, {
      connection: redisClient,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
      ...options,
    });
    // Handle worker events
    worker.on('completed', (job) => {
      logger.info(
        {
          event: 'job_completed',
          jobId: job.id,
          queueName,
          timestamp: new Date().toISOString(),
        },
        `Job ${job.id} completed in queue ${queueName}`
      );
      // Update job status in database
      updateJobStatus(job.id as string, 'completed').catch((err) => {
        logger.error(
          {
            event: 'job_status_update_error',
            jobId: job.id,
            errorMessage: err.message,
            timestamp: new Date().toISOString(),
          },
          `Error updating job status: ${err.message}`
        );
      });
    });
    worker.on('failed', (job, error) => {
      logger.error(
        {
          event: 'job_failed',
          jobId: job?.id,
          queueName,
          errorMessage: getErrorMessage(error),
          timestamp: new Date().toISOString(),
        },
        `Job ${job?.id} failed in queue ${queueName}: ${getTypeSafeError(error)}`
      );
      // Update job status in database if max attempts reached
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        updateJobStatus(
          job.id as string,
          'failed',
          getTypeSafeError(error)
        ).catch((err) => {
          logger.error(
            {
              event: 'job_status_update_error',
              jobId: job.id,
              errorMessage: err.message,
              timestamp: new Date().toISOString(),
            },
            `Error updating job status: ${err.message}`
          );
        });
      }
    });
    // Store worker instance
    workers[queueName] = worker;
    logger.info(
      {
        event: 'worker_created',
        queueName,
        timestamp: new Date().toISOString(),
      },
      `Created worker for queue: ${queueName}`
    );
    return worker;
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getTypeSafeError(error);
    logger.error(
      {
        event: 'worker_create_error',
        queueName,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error creating worker for queue ${queueName}: ${errorMessage}`
    );
    return null;
  }
}
/**
 * Create a queue scheduler
 */
export function createScheduler(queueName: string): QueueScheduler | null {
  try {
    if (inMemoryMode) {
      logger.info(
        {
          event: 'scheduler_create_skipped',
          queueName,
          timestamp: new Date().toISOString(),
        },
        `Skipping scheduler creation for ${queueName} in in-memory mode`
      );
      return null;
    }
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    // Create scheduler with connection
    const scheduler = new QueueScheduler(queueName, {
      connection: redisClient,
    });
    // Store scheduler instance
    schedulers[queueName] = scheduler;
    logger.info(
      {
        event: 'scheduler_created',
        queueName,
        timestamp: new Date().toISOString(),
      },
      `Created scheduler for queue: ${queueName}`
    );
    return scheduler;
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getTypeSafeError(error);
    logger.error(
      {
        event: 'scheduler_create_error',
        queueName,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error creating scheduler for queue ${queueName}: ${errorMessage}`
    );
    return null;
  }
}
/**
 * Update job status in database
 */
async function updateJobStatus(
  jobId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  try {
    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };
    if (status === 'completed') {
      updateData.lastRunAt = new Date();
    }
    if (errorMessage) {
      updateData.lastError = errorMessage;
    }
    await db.update(jobs).set(updateData).where(eq(jobs.id, jobId.toString()));
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getTypeSafeError(error);
    logger.error(
      {
        event: 'job_status_update_error',
        jobId,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error updating job status: ${errorMessage}`
    );
  }
}
/**
 * Get a queue by name
 */
export function getQueue(name: string): Queue | null {
  return queues[name] || null;
}
/**
 * Get a worker by queue name
 */
export function getWorker(queueName: string): Worker | null {
  return workers[queueName] || null;
}
/**
 * Get a scheduler by queue name
 */
export function getScheduler(queueName: string): QueueScheduler | null {
  return schedulers[queueName] || null;
}
/**
 * Close all connections
 */
export async function closeConnections(): Promise<void> {
  try {
    // Close all workers
    for (const workerName in workers) {
      await workers[workerName].close();
    }
    // Close all schedulers
    for (const schedulerName in schedulers) {
      await schedulers[schedulerName].close();
    }
    // Close all queues
    for (const queueName in queues) {
      await queues[queueName].close();
    }
    // Close Redis connection
    if (redisClient) {
      await redisClient.quit();
    }
    logger.info(
      {
        event: 'connections_closed',
        timestamp: new Date().toISOString(),
      },
      'All BullMQ connections closed'
    );
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getTypeSafeError(error);
    logger.error(
      {
        event: 'close_connections_error',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error closing connections: ${errorMessage}`
    );
  }
}
export { defaultJobOptions };
