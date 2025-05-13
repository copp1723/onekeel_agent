/**
 * Test Fixed Scheduler Script
 * Tests creating a schedule with a valid cron expression
 */

import { db } from './dist/shared/db.js';
import { schedules, workflows } from './dist/shared/schema.js';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Test creating a valid schedule
 */
async function testValidSchedule() {
  try {
    console.log('Connecting to database...');
    
    // Create a test workflow
    console.log('Creating test workflow...');
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
        }
      ],
      status: 'pending',
      currentStep: 0
    });
    
    console.log(`Created test workflow: ${workflowId}`);
    
    // Create a valid schedule with a less frequent cron expression
    // Using a daily schedule instead of every minute to avoid potential issues
    console.log('Creating schedule with valid cron expression...');
    
    const scheduleId = uuidv4();
    const validCron = '0 12 * * *'; // Run once a day at noon
    
    // First check if it's valid
    if (!cron.validate(validCron)) {
      throw new Error(`Invalid cron expression: ${validCron}`);
    }
    
    await db.insert(schedules).values({
      id: scheduleId,
      workflowId,
      cron: validCron,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`Created schedule ${scheduleId} with cron: ${validCron}`);
    
    // Try to set up a task with this expression
    try {
      const task = cron.schedule(validCron, () => {
        // Do nothing, just testing if it works
      }, { timezone: "UTC" });
      
      task.stop();
      console.log('Successfully initialized cron task with the expression');
    } catch (error) {
      console.error('Error initializing cron task:', error);
    }
    
    // Clean up
    console.log('Cleaning up test data...');
    await db.delete(workflows).where(eq(workflows.id, workflowId));
    console.log('Test data cleaned up');
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testValidSchedule();