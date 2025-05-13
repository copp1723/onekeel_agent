/**
 * Test Fixed Scheduler Implementation
 * 
 * This script tests the enhanced scheduler service with fallback capabilities.
 * It uses the schedulerFixed.js implementation which gracefully handles database issues.
 */

import {
  initializeScheduler,
  createSchedule,
  getSchedule,
  updateSchedule,
  listSchedules,
  startSchedule,
  stopSchedule,
  deleteSchedule,
  retrySchedule
} from './src/services/schedulerFixed.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main test function
 */
async function testFixedScheduler() {
  try {
    console.log('Testing fixed scheduler implementation...');
    console.log(`Using database URL: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@')}`);
    
    // Step 1: Initialize the scheduler
    console.log('\nStep 1: Initializing scheduler...');
    await initializeScheduler();
    console.log('✓ Scheduler initialized successfully');
    
    // Step 2: Create a test schedule
    console.log('\nStep 2: Creating test schedule...');
    const testSchedule = await createSchedule({
      intent: 'Test Fixed Implementation',
      platform: 'TestPlatform',
      cronExpression: '*/5 * * * *', // Every 5 minutes
      workflowId: `test-workflow-${Date.now()}`
    });
    
    console.log(`✓ Created schedule ${testSchedule.id} with cron: ${testSchedule.cron}`);
    console.log(`  Next run scheduled for: ${testSchedule.nextRunAt}`);
    
    // Step 3: List all schedules
    console.log('\nStep 3: Listing all schedules...');
    const allSchedules = await listSchedules();
    console.log(`✓ Found ${allSchedules.length} schedules`);
    
    // Step 4: Update the schedule
    console.log('\nStep 4: Updating schedule...');
    const updatedSchedule = await updateSchedule(testSchedule.id, {
      intent: 'Updated Test Schedule',
      cronExpression: '*/10 * * * *' // Every 10 minutes
    });
    
    console.log(`✓ Updated schedule: ${updatedSchedule.intent}`);
    console.log(`  New cron: ${updatedSchedule.cron}`);
    console.log(`  New next run: ${updatedSchedule.nextRunAt}`);
    
    // Step 5: Stop the schedule
    console.log('\nStep 5: Stopping schedule...');
    const stoppedSchedule = await stopSchedule(testSchedule.id);
    
    console.log(`✓ Stopped schedule: ${stoppedSchedule.id}`);
    console.log(`  Status: ${stoppedSchedule.status}`);
    console.log(`  Enabled: ${stoppedSchedule.enabled}`);
    
    // Step 6: Get schedule by ID
    console.log('\nStep 6: Getting schedule by ID...');
    const retrievedSchedule = await getSchedule(testSchedule.id);
    
    console.log(`✓ Retrieved schedule: ${retrievedSchedule.id}`);
    console.log(`  Intent: ${retrievedSchedule.intent}`);
    console.log(`  Status: ${retrievedSchedule.status}`);
    
    // Step 7: Filter schedules
    console.log('\nStep 7: Filtering schedules by status...');
    const pausedSchedules = await listSchedules({ status: 'paused' });
    
    console.log(`✓ Found ${pausedSchedules.length} paused schedules`);
    
    // Step 8: Restart the schedule
    console.log('\nStep 8: Restarting schedule...');
    const restartedSchedule = await startSchedule(testSchedule.id);
    
    console.log(`✓ Restarted schedule: ${restartedSchedule.id}`);
    console.log(`  Status: ${restartedSchedule.status}`);
    console.log(`  Enabled: ${restartedSchedule.enabled}`);
    
    // Wait a moment for any asynchronous operations
    console.log('\nWaiting for 2 seconds...');
    await sleep(2000);
    
    // Step 9: Clean up
    console.log('\nStep 9: Cleaning up test schedule...');
    const deleted = await deleteSchedule(testSchedule.id);
    
    console.log(`✓ Schedule deleted: ${deleted}`);
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
  }
}

// Run the test
testFixedScheduler();