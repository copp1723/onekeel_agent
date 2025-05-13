/**
 * Test Fixed Scheduler Script
 * Tests creating a schedule with the fixed scheduler implementation
 * 
 * Usage: node test-fixed-scheduler.js
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { v4 as uuidv4 } from 'uuid';
import { workflows } from './dist/shared/schema.js';
import { eq } from 'drizzle-orm';
import { initializeMailer } from './dist/services/fixed-mailerService.js';
import * as fixedScheduler from './dist/services/fixed-schedulerService.js';

// Load environment variables
dotenv.config();

/**
 * Test creating a valid schedule with the fixed scheduler
 */
async function testFixedScheduler() {
  try {
    console.log('Testing Fixed Scheduler Implementation...');
    
    console.log('Using Replit PostgreSQL environment variables for database connection');
    const dbString = process.env.DATABASE_URL || 
      `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
    console.log(`Connecting to database: ${dbString.replace(/:[^:]*@/, ':***@')}`);
    
    // Initialize the mailer service (required by email notifications)
    await initializeMailer(process.env.SENDGRID_API_KEY);
    console.log('Mailer service initialized');
    
    // Create a test workflow to schedule
    const workflowId = await createTestWorkflow();
    console.log(`Created test workflow: ${workflowId}`);
    
    // Initialize the fixed scheduler
    await fixedScheduler.initializeScheduler();
    console.log('Fixed scheduler initialized');
    
    // Create a schedule using the fixed scheduler
    console.log('Creating schedule using fixed scheduler...');
    const schedule = await fixedScheduler.createSchedule(
      workflowId,  // workflowId
      '*/5 * * * *',  // Every 5 minutes (cron expression)
      {
        description: 'Test fixed scheduler',
        enabled: true
      }
    );
    
    console.log('Successfully created schedule:', {
      id: schedule.id,
      workflowId: schedule.workflowId,
      cron: schedule.cron,
      enabled: schedule.enabled,
      createdAt: schedule.createdAt
    });
    
    // Get the schedule by ID
    console.log('Getting schedule details...');
    const retrievedSchedule = await fixedScheduler.getSchedule(schedule.id);
    console.log('Retrieved schedule:', {
      id: retrievedSchedule.id,
      workflowId: retrievedSchedule.workflowId,
      cron: retrievedSchedule.cron,
      enabled: retrievedSchedule.enabled
    });
    
    // Update the schedule
    console.log('Updating schedule...');
    const updatedSchedule = await fixedScheduler.updateSchedule(schedule.id, {
      cronExpression: '*/10 * * * *',  // Every 10 minutes
      enabled: true
    });
    
    console.log('Successfully updated schedule:', {
      id: updatedSchedule.id,
      workflowId: updatedSchedule.workflowId,
      cron: updatedSchedule.cron,
      enabled: updatedSchedule.enabled
    });
    
    console.log('Waiting 3 seconds before deleting schedule...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete the schedule
    console.log('Deleting schedule...');
    await fixedScheduler.deleteSchedule(schedule.id);
    console.log(`Schedule ${schedule.id} deleted successfully`);
    
    // Clean up the test workflow
    await cleanupTestWorkflow(workflowId);
    console.log(`Test workflow ${workflowId} cleaned up`);
    
    console.log('✅ Fixed scheduler test completed successfully');
  } catch (error) {
    console.error('Error testing fixed scheduler:', error);
  }
}

/**
 * Create a test workflow for scheduling
 */
async function createTestWorkflow() {
  const workflowId = uuidv4();
  
  await db.insert(workflows).values({
    id: workflowId,
    name: 'Test Workflow for Fixed Scheduler',
    type: 'test',
    platform: 'demo',
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
      startedBy: 'fixed-scheduler-test',
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
  await db.delete(workflows).where(eq(workflows.id, workflowId));
}

// Run the test
testFixedScheduler();