/**
 * Test Simple Scheduler Script
 * Tests the simplified scheduler implementation
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { v4 as uuidv4 } from 'uuid';
import { workflows } from './dist/shared/schema.js';
import { 
  createSchedule, 
  getSchedule, 
  listSchedules,
  updateSchedule,
  deleteSchedule,
  initializeScheduler
} from './dist/services/schedulerServiceSimple.js';

// Load environment variables
dotenv.config();

/**
 * Test creating a schedule with the simple scheduler
 */
async function testSimpleScheduler() {
  try {
    console.log('Testing Simple Scheduler System...');
    
    // Create a test workflow
    const workflowId = await createTestWorkflow();
    console.log(`Created test workflow: ${workflowId}`);
    
    // Initialize the scheduler
    await initializeScheduler();
    
    // Create a schedule for our test workflow
    console.log('Creating schedule...');
    const schedule = await createSchedule(
      workflowId,
      '*/5 * * * *', // Every 5 minutes
      {
        description: 'Test schedule from simple scheduler',
        tags: ['test', 'simple-scheduler']
      }
    );
    console.log('Created schedule:', schedule);
    
    // Get the schedule by ID
    console.log('Getting schedule...');
    const retrievedSchedule = await getSchedule(schedule.id);
    console.log('Retrieved schedule:', retrievedSchedule);
    
    // List all schedules
    console.log('Listing schedules...');
    const allSchedules = await listSchedules();
    console.log(`Found ${allSchedules.length} schedules`);
    
    // Update the schedule
    console.log('Updating schedule...');
    const updatedSchedule = await updateSchedule(schedule.id, {
      description: 'Updated description',
      cronExpression: '*/10 * * * *' // Every 10 minutes
    });
    console.log('Updated schedule:', updatedSchedule);
    
    // Wait for a moment to allow the schedule to potentially run
    console.log('Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete the schedule
    console.log('Deleting schedule...');
    const deleteResult = await deleteSchedule(schedule.id);
    console.log('Delete result:', deleteResult);
    
    // Clean up the test workflow
    await cleanupTestWorkflow(workflowId);
    console.log(`Cleaned up test workflow: ${workflowId}`);
    
    console.log('Simple scheduler test completed successfully');
  } catch (error) {
    console.error('Error testing simple scheduler:', error);
  }
}

/**
 * Create a test workflow for scheduling
 */
async function createTestWorkflow() {
  const workflowId = uuidv4();
  
  await db.insert(workflows).values({
    id: workflowId,
    name: 'Test Simple Scheduler Workflow',
    steps: [
      { 
        id: 'step1', 
        name: 'Test Step', 
        type: 'processData', 
        config: { operation: 'test' } 
      }
    ],
    status: 'pending',
    currentStep: 0,
    context: {
      startedBy: 'test-simple-scheduler',
      timestamp: new Date().toISOString()
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUpdated: new Date()
  });
  
  return workflowId;
}

/**
 * Clean up test workflow
 */
async function cleanupTestWorkflow(workflowId) {
  await db.delete(workflows).where('id', workflowId);
}

// Run the test
testSimpleScheduler();