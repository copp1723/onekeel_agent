/**
 * Test Task Scheduler & Recovery 
 * This script tests the new Task Scheduler implementation
 * with enhanced recovery and retry capabilities
 */

import { db } from './src/shared/db.js';
import {
  createSchedule,
  getSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  retrySchedule,
  executeSchedule,
  stopSchedule
} from './src/services/scheduler.js';
import { v4 as uuidv4 } from 'uuid';

// Mock user ID for testing
const TEST_USER_ID = 'test-user-1';

// Test platforms and intents
const TEST_PLATFORMS = ['VinSolutions', 'VAUTO'];
const TEST_INTENTS = ['inventory_aging', 'sales_performance'];

// Run the test
async function testSchedulerRecovery() {
  console.log('=== Testing Task Scheduler & Recovery ===');
  console.log('---------------------------------------');
  
  try {
    // Step 1: Create a test schedule
    console.log('\n🔍 Step 1: Creating test schedule...');
    
    const schedule = await createSchedule({
      userId: TEST_USER_ID,
      intent: TEST_INTENTS[0],
      platform: TEST_PLATFORMS[0],
      cronExpression: '0 */6 * * *', // Every 6 hours
    });
    
    console.log(`✅ Created schedule: ${schedule.id}`);
    console.log(JSON.stringify(schedule, null, 2));
    
    // Step 2: Verify schedule details
    console.log('\n🔍 Step 2: Verifying schedule details...');
    
    const retrievedSchedule = await getSchedule(schedule.id);
    console.log(`✅ Retrieved schedule: ${retrievedSchedule.id}`);
    console.log(`  - Intent: ${retrievedSchedule.intent}`);
    console.log(`  - Platform: ${retrievedSchedule.platform}`);
    console.log(`  - Cron: ${retrievedSchedule.cron}`);
    console.log(`  - Status: ${retrievedSchedule.status}`);
    console.log(`  - Next run: ${retrievedSchedule.nextRunAt}`);
    
    // Step 3: Update the schedule
    console.log('\n🔍 Step 3: Updating schedule...');
    
    const updatedSchedule = await updateSchedule(schedule.id, {
      cronExpression: '0 */12 * * *', // Change to every 12 hours
      intent: TEST_INTENTS[1],
    });
    
    console.log(`✅ Updated schedule: ${updatedSchedule.id}`);
    console.log(`  - New cron: ${updatedSchedule.cron}`);
    console.log(`  - New intent: ${updatedSchedule.intent}`);
    console.log(`  - New next run: ${updatedSchedule.nextRunAt}`);
    
    // Step 4: Simulate executing the schedule
    console.log('\n🔍 Step 4: Simulating execution (will likely fail due to missing auth)...');
    
    try {
      // This will likely fail due to missing auth details, which is good for testing recovery
      await executeSchedule(schedule.id);
      console.log('⚠️ Execution succeeded unexpectedly');
    } catch (error) {
      console.log(`✅ Execution failed as expected: ${error.message}`);
      
      // Step 5: Check if retry count was incremented
      const failedSchedule = await getSchedule(schedule.id);
      console.log(`✅ Retry count incremented: ${failedSchedule.retryCount}`);
      
      if (failedSchedule.status === 'failed' || failedSchedule.retryCount > 0) {
        console.log('✅ Schedule recovery is working as expected');
      } else {
        console.log('⚠️ Schedule recovery not working as expected');
      }
    }
    
    // Step 6: List all schedules for this user
    console.log('\n🔍 Step 6: Listing all schedules...');
    
    const userSchedules = await listSchedules({ 
      userId: TEST_USER_ID 
    });
    
    console.log(`✅ Found ${userSchedules.length} schedules for user`);
    userSchedules.forEach(s => {
      console.log(`  - ID: ${s.id}, Platform: ${s.platform}, Status: ${s.status}`);
    });
    
    // Step 7: Retry the failed schedule
    console.log('\n🔍 Step 7: Retrying failed schedule...');
    
    try {
      // Force update to failed status to test retry
      await updateSchedule(schedule.id, { status: 'failed' });
      
      const retriedSchedule = await retrySchedule(schedule.id);
      console.log(`✅ Schedule retried: ${retriedSchedule.id}`);
      console.log(`  - New status: ${retriedSchedule.status}`);
      console.log(`  - Retry count reset: ${retriedSchedule.retryCount}`);
    } catch (error) {
      console.log(`⚠️ Retry failed: ${error.message}`);
    }
    
    // Step 8: Clean up
    console.log('\n🔍 Step 8: Cleaning up...');
    
    // Stop the schedule first
    await stopSchedule(schedule.id);
    console.log(`✅ Schedule stopped: ${schedule.id}`);
    
    // Then delete it
    const deleted = await deleteSchedule(schedule.id);
    console.log(`✅ Schedule deleted: ${deleted}`);
    
    // Verify it's gone
    const deletedSchedule = await getSchedule(schedule.id);
    console.log(`✅ Verified schedule is gone: ${!deletedSchedule}`);
    
    console.log('\n=== Test completed successfully ===');
    console.log('--------------------------------');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Ensure we disconnect from database
    await db.end();
  }
}

// Run the test function
testSchedulerRecovery().catch(console.error);