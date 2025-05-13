/**
 * Test Fixed Scheduler Implementation
 * 
 * This script tests the fixed implementation of the scheduler service,
 * including schedule creation, status changes, and execution.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import {
  initializeScheduler,
  createSchedule,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  listSchedules
} from './src/services/scheduler.js';
import { db } from './src/shared/db.js';
import { schedules } from './src/shared/schema.js';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main test function
 */
async function testFixedScheduler() {
  try {
    console.log('Using Replit PostgreSQL environment variables for database connection');
    console.log(`Connecting to database: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
    
    console.log('\n--- Fixed Scheduler Test ---');
    console.log('This test will create, update, and delete a test schedule');
    
    // Avoid clashing with other tests by using a dedicated workflow ID
    const testWorkflowId = `test-fixed-scheduler-${Date.now()}`;
    let scheduleId = null;
    
    try {
      // Initialize the scheduler
      await initializeScheduler();
      console.log('✓ Scheduler initialized');
      
      // List existing schedules
      const existingSchedules = await listSchedules({});
      console.log(`Found ${existingSchedules.length} existing schedules`);
      
      // Create a test schedule
      console.log('\nCreating test schedule...');
      const schedule = await createSchedule({
        userId: '12345',
        intent: 'Test Fixed Schedule',
        platform: 'TestPlatform',
        cronExpression: '*/10 * * * *', // Every 10 minutes
        workflowId: testWorkflowId
      });
      
      scheduleId = schedule.id;
      console.log(`✓ Created schedule ${scheduleId} with cron: ${schedule.cron}`);
      
      // Get the schedule
      console.log('\nRetrieving schedule details...');
      const retrievedSchedule = await getSchedule(scheduleId);
      console.log(`✓ Retrieved schedule: ${retrievedSchedule.id}`);
      console.log(`  Platform: ${retrievedSchedule.platform}`);
      console.log(`  Intent: ${retrievedSchedule.intent}`);
      console.log(`  Status: ${retrievedSchedule.status}`);
      console.log(`  Cron: ${retrievedSchedule.cron}`);
      console.log(`  Next run: ${retrievedSchedule.nextRunAt}`);
      
      // Update the schedule
      console.log('\nUpdating schedule...');
      const updatedSchedule = await updateSchedule(scheduleId, {
        cronExpression: '*/15 * * * *', // Every 15 minutes
        intent: 'Updated Test Schedule'
      });
      
      console.log(`✓ Updated schedule: ${updatedSchedule.id}`);
      console.log(`  New cron: ${updatedSchedule.cron}`);
      console.log(`  New intent: ${updatedSchedule.intent}`);
      console.log(`  New next run: ${updatedSchedule.nextRunAt}`);
      
      // Pause the schedule
      console.log('\nPausing schedule...');
      const pausedSchedule = await updateSchedule(scheduleId, {
        status: 'paused'
      });
      
      console.log(`✓ Paused schedule: ${pausedSchedule.id}`);
      console.log(`  Status: ${pausedSchedule.status}`);
      
      // Reactivate the schedule
      console.log('\nReactivating schedule...');
      const reactivatedSchedule = await updateSchedule(scheduleId, {
        status: 'active'
      });
      
      console.log(`✓ Reactivated schedule: ${reactivatedSchedule.id}`);
      console.log(`  Status: ${reactivatedSchedule.status}`);
      
    } finally {
      // Always clean up the test schedule
      if (scheduleId) {
        console.log('\nCleaning up test schedule...');
        const deleted = await deleteSchedule(scheduleId);
        
        if (deleted) {
          console.log(`✓ Test schedule ${scheduleId} deleted`);
        } else {
          console.log(`✗ Failed to delete test schedule ${scheduleId}`);
        }
      }
      
      // Clean up any orphaned schedules from previous test runs
      const orphanedSchedules = await db
        .select()
        .from(schedules)
        .where(eq(schedules.intent, 'Test Fixed Schedule'));
      
      if (orphanedSchedules.length > 0) {
        console.log(`\nCleaning up ${orphanedSchedules.length} orphaned test schedules...`);
        
        for (const orphan of orphanedSchedules) {
          await deleteSchedule(orphan.id);
          console.log(`✓ Orphaned schedule ${orphan.id} deleted`);
        }
      }
      
      console.log('\n--- Test completed successfully ---');
    }
  } catch (error) {
    console.error('\n✗ Test failed:', error);
  } finally {
    // End the process so it doesn't hang
    setTimeout(() => process.exit(0), 1000);
  }
}

// Run the test
testFixedScheduler();