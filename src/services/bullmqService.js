/**
 * BullMQ Service
 *
 * Provides queue management for distributed job processing
 */
import { Queue, Worker, QueueScheduler, ConnectionOptions, QueueOptions, WorkerOptions } from 'bullmq';
import { logger } from '../utils/logger.js';
import { isError } from '../utils/errorUtils.js';
import { QUEUE_NAMES } from '../shared/constants';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Map to store active queues
const queues = new Map();

// Map to store active workers
const workers = new Map();

// Map to store queue schedulers
const schedulers = new Map();

/**
 * Create a new queue
 */
export function createQueue(name, options = {}) {
  if (queues.has(name)) {
    return queues.get(name);
  }

  const queueOptions = {
    connection: redisConnection,
    ...options,
  };

  const queue = new Queue(name, queueOptions);
  queues.set(name, queue);

  logger.info(
    {
      event: 'queue_created',
      queueName: name,
    },
    `Created queue: ${name}`
  );

  return queue;
}

/**
 * Create a new worker
 */
export function createWorker(queueName, processor, options = {}) {
  if (workers.has(queueName)) {
    return workers.get(queueName);
  }

  const workerOptions = {
    connection: redisConnection,
    ...options,
  };

  const worker = new Worker(queueName, processor, workerOptions);

  // Set up event handlers
  worker.on('completed', (job) => {
    logger.info(
      {
        event: 'job_completed',
        jobId: job.id,
        queueName,
      },
      `Job ${job.id} completed in queue ${queueName}`
    );
  });

  worker.on('failed', (job, error) => {
    logger.error(
      {
        event: 'job_failed',
        jobId: job?.id,
        queueName,
        error: isError(error) ? error.message : String(error),
      },
      `Job ${job?.id} failed in queue ${queueName}: ${isError(error) ? error.message : String(error)}`
    );
  });

  workers.set(queueName, worker);

  logger.info(
    {
      event: 'worker_created',
      queueName,
    },
    `Created worker for queue: ${queueName}`
  );

  return worker;
}

/**
 * Create a queue scheduler
 */
export function createScheduler(queueName, options = {}) {
  if (schedulers.has(queueName)) {
    return schedulers.get(queueName);
  }

  const schedulerOptions = {
    connection: redisConnection,
    ...options,
  };

  const scheduler = new QueueScheduler(queueName, schedulerOptions);
  schedulers.set(queueName, scheduler);

  logger.info(
    {
      event: 'scheduler_created',
      queueName,
    },
    `Created scheduler for queue: ${queueName}`
  );

  return scheduler;
}

/**
 * Get a queue by name
 */
export function getQueue(name) {
  return queues.get(name);
}

/**
 * Get a worker by queue name
 */
export function getWorker(queueName) {
  return workers.get(queueName);
}

/**
 * Close all connections
 */
export async function closeAll() {
  const closePromises = [];

  // Close all workers
  for (const [name, worker] of workers.entries()) {
    logger.info(`Closing worker for queue: ${name}`);
    closePromises.push(worker.close());
  }

  // Close all schedulers
  for (const [name, scheduler] of schedulers.entries()) {
    logger.info(`Closing scheduler for queue: ${name}`);
    closePromises.push(scheduler.close());
  }

  // Close all queues
  for (const [name, queue] of queues.entries()) {
    logger.info(`Closing queue: ${name}`);
    closePromises.push(queue.close());
  }

  await Promise.all(closePromises);
  logger.info('All BullMQ connections closed');
}

// Export queue names for convenience
export { QUEUE_NAMES };
