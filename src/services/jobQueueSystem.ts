/**
 * Job Queue System
 * 
 * Main entry point for the distributed job queue system
 * Initializes all components and provides a unified interface
 */
import { initializeRedis, closeConnections } from './bullmqService.js.js';
import {  getErrorMessage } from '...';
import {  getErrorMessage } from '....js';
import { isError } from '../utils/errorUtils.js.js';
import { initializeQueueManager } from './queueManager.js.js';
import { initializeIngestionWorker } from '../workers/ingestionWorker.js.js';
import { initializeProcessingWorker } from '../workers/processingWorker.js.js';
import { initializeDistributedScheduler } from './distributedScheduler.js.js';
import logger from '../utils/logger.js.js';
/**
 * Initialize the job queue system
 */
export async function initializeJobQueueSystem(): Promise<void> {
  try {
    logger.info({ 
      event: 'job_queue_system_initializing', 
      timestamp: new Date().toISOString() 
    }, 'Initializing job queue system...');
    // Initialize Redis connection
    await initializeRedis();
    // Initialize queue manager
    await initializeQueueManager();
    // Initialize workers
    initializeIngestionWorker();
    initializeProcessingWorker();
    // Initialize distributed scheduler
    await initializeDistributedScheduler();
    logger.info({ 
      event: 'job_queue_system_initialized', 
      timestamp: new Date().toISOString() 
    }, 'Job queue system initialized successfully');
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    logger.error({ 
      event: 'job_queue_system_init_error', 
      errorMessage: error instanceof Error ? isError(error) ? getErrorMessage(error) : String(error) : String(error), 
      timestamp: new Date().toISOString() 
    }, `Error initializing job queue system: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)}`);
    throw error;
  }
}
/**
 * Shutdown the job queue system
 */
export async function shutdownJobQueueSystem(): Promise<void> {
  try {
    logger.info({ 
      event: 'job_queue_system_shutting_down', 
      timestamp: new Date().toISOString() 
    }, 'Shutting down job queue system...');
    // Close all connections
    await closeConnections();
    logger.info({ 
      event: 'job_queue_system_shutdown_complete', 
      timestamp: new Date().toISOString() 
    }, 'Job queue system shutdown complete');
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    logger.error({ 
      event: 'job_queue_system_shutdown_error', 
      errorMessage: error instanceof Error ? isError(error) ? getErrorMessage(error) : String(error) : String(error), 
      timestamp: new Date().toISOString() 
    }, `Error shutting down job queue system: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)}`);
    throw error;
  }
}
// Export all components for direct access
export * from './bullmqService.js.js';
export * from './queueManager.js.js';
export * from './distributedScheduler.js.js';
export * from '../workers/ingestionWorker.js.js';
export * from '../workers/processingWorker.js.js';
