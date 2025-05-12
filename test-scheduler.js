/**
 * Test script for Task Scheduler functionality
 * This script tests creating, listing, and triggering scheduled workflows
 * 
 * Usage: node test-scheduler.js
 */

import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { db } from './dist/shared/db.js';
import { schedules, workflows } from './dist/shared/schema.js';
import { 
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule 
} from './dist/services/schedulerService.js';

// Load environment variables
dotenv.config();

async function testScheduler() {
  try {
    console.log('Testing Scheduler System...');
    
    // Generate a test workflow for scheduling
    const workflowId = await createTestWorkflow();
    console.log(`Created test workflow: ${workflowId}`);
    
    // Create a schedule for the workflow (run every minute)
    console.log('Creating schedule...');
    const schedule = await createSchedule(
      workflowId,
      '*/1 * * * *', // Every minute
      true // enabled
    );
    console.log(`Created schedule: ${JSON.stringify(schedule, null, 2)}`);
    
    // List all schedules
    console.log('\nListing all schedules:');
    const scheduleList = await listSchedules();
    console.log(JSON.stringify(scheduleList, null, 2));
    
    // Update the schedule (change to every 5 minutes)
    console.log('\nUpdating schedule...');
    const updatedSchedule = await updateSchedule(schedule.id, {
      cron: '*/5 * * * *', // Every 5 minutes
      enabled: true
    });
    console.log(`Updated schedule: ${JSON.stringify(updatedSchedule, null, 2)}`);
    
    // Wait for potential execution and then clean up
    console.log('\nWaiting 10 seconds for potential execution...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Delete the schedule
    console.log('\nDeleting schedule...');
    const deleteResult = await deleteSchedule(schedule.id);
    console.log(`Schedule deleted: ${deleteResult}`);
    
    // Clean up the test workflow
    await cleanupTestWorkflow(workflowId);
    console.log(`Test workflow ${workflowId} cleaned up`);
    
    console.log('\nScheduler test completed successfully');
  } catch (error) {
    console.error('Error testing scheduler:', error);
  }
}

/**
 * Create a test workflow for scheduling
 */
async function createTestWorkflow() {
  const workflowId = uuidv4();
  
  await db.insert(workflows).values({
    id: workflowId,
    name: 'Test Scheduled Workflow',
    description: 'Created for scheduler testing',
    createdBy: 'test-script',
    steps: [
      {
        id: uuidv4(),
        name: 'Process Data',
        type: 'dataProcessing',
        config: {
          operation: 'transform',
          data: { sample: 'data' }
        }
      },
      {
        id: uuidv4(),
        name: 'Generate Insights',
        type: 'insightGeneration',
        config: {
          platform: 'VinSolutions'
        }
      }
    ],
    status: 'pending',
    currentStep: 0
  });
  
  return workflowId;
}

/**
 * Clean up test workflow
 */
async function cleanupTestWorkflow(workflowId) {
  await db.delete(workflows).where(workflows.id.equals(workflowId));
}

// Run the test
testScheduler().catch(console.error);