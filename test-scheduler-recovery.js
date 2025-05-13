/**
 * Test Scheduler Recovery 
 * 
 * This script tests the enhanced scheduler service with error recovery capabilities.
 * It demonstrates:
 * 1. Creating a scheduled task
 * 2. Handling execution errors and automatic retry
 * 3. Manual recovery of failed schedules
 */

import { 
  initializeScheduler, 
  createSchedule, 
  getSchedule, 
  updateSchedule, 
  listSchedules, 
  retrySchedule,
  deleteSchedule 
} from './src/services/scheduler.js';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a test directory
const TEST_DIR = join(__dirname, 'test-scheduler-results');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Global variables
let testScheduleId = null;
let testWorkflowId = null;

/**
 * Wait for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main test function
 */
async function testSchedulerRecovery() {
  try {
    console.log('Using Replit PostgreSQL environment variables for database connection');
    console.log(`Connecting to database: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@')}`);
    
    console.log('\n--- Scheduler Recovery Test ---');
    
    // Initialize the scheduler
    await initializeScheduler();
    console.log('✓ Scheduler initialized');
    
    // Generate a unique test workflow ID
    testWorkflowId = `test-recovery-${Date.now()}`;
    
    // Create a test schedule with a quick execution interval
    console.log('\nStep 1: Creating test schedule...');
    const schedule = await createSchedule({
      userId: '12345', // Use a dummy user ID
      intent: 'Test Recovery Schedule',
      platform: 'TestPlatform',
      cronExpression: '*/1 * * * *', // Run every minute
      workflowId: testWorkflowId
    });
    
    testScheduleId = schedule.id;
    console.log(`✓ Created schedule ${testScheduleId} with cron: ${schedule.cron}`);
    console.log(`  Next run scheduled for: ${schedule.nextRunAt}`);
    
    // Get current schedules
    const activeSchedules = await listSchedules({ status: 'active' });
    console.log(`\nTotal active schedules: ${activeSchedules.length}`);
    
    // Wait for potential execution and check status
    console.log('\nStep 2: Waiting for potential execution (15 seconds)...');
    await sleep(15000);
    
    // Check schedule status
    const updatedSchedule = await getSchedule(testScheduleId);
    console.log(`\nSchedule status: ${updatedSchedule.status}`);
    console.log(`Retry count: ${updatedSchedule.retryCount}`);
    
    if (updatedSchedule.status === 'failed') {
      console.log(`Last error: ${updatedSchedule.lastError}`);
      
      // Demonstrate retry capability
      console.log('\nStep 3: Manually retrying failed schedule...');
      const retriedSchedule = await retrySchedule(testScheduleId);
      console.log(`✓ Schedule ${testScheduleId} retried`);
      console.log(`  New status: ${retriedSchedule.status}`);
      console.log(`  Reset retry count: ${retriedSchedule.retryCount}`);
      
      // Wait to see if retry worked
      console.log('\nWaiting to check retry results (15 seconds)...');
      await sleep(15000);
      
      const finalSchedule = await getSchedule(testScheduleId);
      console.log(`\nFinal schedule status: ${finalSchedule.status}`);
      console.log(`Final retry count: ${finalSchedule.retryCount}`);
    } else {
      console.log('\nSchedule did not fail, cannot demonstrate recovery');
    }
    
    // Clean up
    console.log('\nCleaning up test schedule...');
    await deleteSchedule(testScheduleId);
    console.log(`✓ Test schedule ${testScheduleId} deleted`);
    
    console.log('\n--- Test completed ---');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    
    // Try to clean up
    if (testScheduleId) {
      try {
        await deleteSchedule(testScheduleId);
        console.log(`Test schedule ${testScheduleId} deleted during error cleanup`);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  } finally {
    setTimeout(() => process.exit(0), 1000);
  }
}

// Run the test
testSchedulerRecovery();