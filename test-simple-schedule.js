/**
 * Test Simple Scheduler Script
 * Tests the simplified scheduler implementation
 */

import * as simpleScheduler from './dist/services/simpleScheduler.js';
import { db } from './dist/shared/db.js';
import { workflows } from './dist/shared/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test creating a schedule with the simple scheduler
 */
async function testSimpleScheduler() {
  try {
    console.log('Connecting to database...');
    
    // Create a test workflow
    console.log('Creating test workflow...');
    const workflowId = uuidv4();
    
    await db.insert(workflows).values({
      id: workflowId,
      name: 'Test Simple Scheduler Workflow',
      description: 'Created for simple scheduler testing',
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
        }
      ],
      status: 'pending',
      currentStep: 0
    });
    
    console.log(`Created test workflow: ${workflowId}`);
    
    // Create a schedule with the simple scheduler
    console.log('Creating schedule with simple scheduler...');
    const cronExpression = '*/5 * * * *'; // Every 5 minutes
    
    const schedule = await simpleScheduler.createSchedule(
      workflowId,
      cronExpression,
      true // enabled
    );
    
    console.log(`Created schedule ${schedule.id} with cron: ${cronExpression}`);
    console.log('Schedule details:', schedule);
    
    // Let's wait a moment to see if there are any errors
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Clean up
    console.log('Stopping the schedule...');
    await simpleScheduler.stopSchedule(schedule.id);
    
    console.log('Cleaning up test data...');
    await db.delete(workflows).where(eq(workflows.id, workflowId));
    console.log('Test data cleaned up');
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error in simple scheduler test:', error);
  }
}

// Run the test
testSimpleScheduler();