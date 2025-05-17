/**
 * Test Script for the Distributed Job Queue System
 * 
 * This script tests the BullMQ-based job queue system with Redis
 * 
 * Usage: node test-job-queue.js
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  initializeJobQueueSystem, 
  shutdownJobQueueSystem,
  addJob,
  addRepeatedJob,
  QUEUE_NAMES,
  JOB_TYPES
} from './dist/services/jobQueueSystem.js';
import { createIngestionTaskLog } from './dist/workers/ingestionWorker.js';
import { createProcessingTaskLog } from './dist/workers/processingWorker.js';

// Load environment variables
dotenv.config();

// Check if DB connection string is available
if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  console.error('No database connection information found');
  console.error('Please set DATABASE_URL or PostgreSQL environment variables');
  process.exit(1);
}

// Check if Redis connection string is available
if (!process.env.REDIS_HOST) {
  console.warn('No Redis host found, will use in-memory mode');
  console.warn('Set REDIS_HOST environment variable for Redis mode');
}

// Main test function
async function runTest() {
  try {
    console.log('Starting job queue system test...');
    
    // Initialize the job queue system
    await initializeJobQueueSystem();
    
    console.log('Job queue system initialized');
    
    // Test 1: Add a simple job
    console.log('\nTest 1: Adding a simple job...');
    const taskId1 = await createProcessingTaskLog(
      JOB_TYPES.REPORT_PROCESSING,
      {
        reportPath: './test-data/sample-report.csv',
        platform: 'TestPlatform',
        reportType: 'test_report'
      }
    );
    
    const jobId1 = await addJob(
      QUEUE_NAMES.PROCESSING,
      JOB_TYPES.REPORT_PROCESSING,
      {
        taskId: taskId1,
        reportPath: './test-data/sample-report.csv',
        platform: 'TestPlatform',
        reportType: 'test_report'
      },
      {
        priority: 3,
        attempts: 2
      }
    );
    
    console.log(`Added job ${jobId1} with task ID ${taskId1}`);
    
    // Test 2: Add a repeatable job
    console.log('\nTest 2: Adding a repeatable job...');
    const taskId2 = await createIngestionTaskLog(
      'TestPlatform',
      'test_intent'
    );
    
    const jobId2 = await addRepeatedJob(
      QUEUE_NAMES.INGESTION,
      JOB_TYPES.EMAIL_INGESTION,
      {
        taskId: taskId2,
        platform: 'TestPlatform',
        intent: 'test_intent'
      },
      '*/5 * * * *', // Every 5 minutes
      {
        priority: 5,
        attempts: 3
      }
    );
    
    console.log(`Added repeatable job ${jobId2} with task ID ${taskId2}`);
    
    // Wait for jobs to be processed
    console.log('\nWaiting for jobs to be processed (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Shutdown the job queue system
    console.log('\nShutting down job queue system...');
    await shutdownJobQueueSystem();
    
    console.log('Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running test:', error);
    
    // Try to shutdown gracefully
    try {
      await shutdownJobQueueSystem();
    } catch (shutdownError) {
      console.error('Error shutting down job queue system:', shutdownError);
    }
    
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);
