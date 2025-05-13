/**
 * Test Script for the Simple Scheduler Implementation
 * 
 * This script tests the simplified scheduler implementation that uses
 * setInterval instead of node-cron to avoid the "Invalid time value" errors.
 * 
 * Usage: node test-scheduler-simple.js
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { v4 as uuidv4 } from 'uuid';
import { workflows } from './dist/shared/schema.js';
import { initializeMailer } from './dist/services/fixed-mailerService.js';
import * as simpleScheduler from './dist/services/schedulerServiceSimple.js';

// Load environment variables
dotenv.config();

// Check if DB connection string is available
if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  console.error('No database connection information found');
  console.error('Please set DATABASE_URL or PostgreSQL environment variables');
  process.exit(1);
}

// Check if SendGrid API key is available
if (!process.env.SENDGRID_API_KEY) {
  console.warn('No SendGrid API key found, will use nodemailer fallback');
}

// Test the simplified scheduler implementation
async function testSimpleScheduler() {
  try {
    console.log('Using Replit PostgreSQL environment variables for database connection');
    const dbString = process.env.DATABASE_URL || 
      `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
    console.log(`Connecting to database: ${dbString.replace(/:[^:]*@/, ':***@')}`);
    
    // Initialize the mailer service
    await initializeMailer(process.env.SENDGRID_API_KEY);
    
    console.log('Testing Simple Scheduler System...');
    
    // Create a test workflow
    const workflowId = await createTestWorkflow();
    console.log(`Created test workflow: ${workflowId}`);
    
    // Initialize the scheduler
    await simpleScheduler.initializeScheduler();
    
    // Create a schedule for our test workflow
    // Use a 5-minute interval cron expression
    console.log('Creating schedule...');
    try {
      const schedule = await simpleScheduler.createSchedule(
        workflowId,
        '*/5 * * * *', // Every 5 minutes
        {
          description: 'Test schedule from simple scheduler',
          enabled: true
        }
      );
      
      console.log('Created schedule:', {
        id: schedule.id,
        workflowId: schedule.workflowId,
        cron: schedule.cron,
        enabled: schedule.enabled
      });
      
      // Get the schedule by ID
      console.log('Getting schedule details...');
      const retrievedSchedule = await simpleScheduler.getSchedule(schedule.id);
      console.log('Retrieved schedule:', {
        id: retrievedSchedule.id,
        workflowId: retrievedSchedule.workflowId,
        cron: retrievedSchedule.cron,
        lastRunAt: retrievedSchedule.lastRunAt,
        enabled: retrievedSchedule.enabled
      });
      
      // List all schedules
      console.log('Listing all schedules...');
      const allSchedules = await simpleScheduler.listSchedules();
      console.log(`Found ${allSchedules.length} schedules`);
      
      // Update the schedule
      console.log('Updating schedule...');
      const updatedSchedule = await simpleScheduler.updateSchedule(schedule.id, {
        cronExpression: '*/10 * * * *', // Every 10 minutes
      });
      
      console.log('Updated schedule:', {
        id: updatedSchedule.id,
        workflowId: updatedSchedule.workflowId,
        cron: updatedSchedule.cron,
        enabled: updatedSchedule.enabled
      });
      
      // Wait for a moment to allow the schedule to run
      console.log('Waiting 3 seconds to allow for potential execution...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Delete the schedule
      console.log('Deleting schedule...');
      await simpleScheduler.deleteSchedule(schedule.id);
      console.log('Schedule deleted successfully');
      
      // Clean up the test workflow
      await cleanupTestWorkflow(workflowId);
      console.log(`Cleaned up test workflow: ${workflowId}`);
      
      console.log('✅ Simple scheduler test completed successfully');
    } catch (scheduleError) {
      console.error('Error with scheduling:', scheduleError);
      
      // Still try to clean up the test workflow
      try {
        await cleanupTestWorkflow(workflowId);
        console.log(`Cleaned up test workflow: ${workflowId}`);
      } catch (cleanupError) {
        console.error('Error cleaning up:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Exit after test completes
    setTimeout(() => process.exit(0), 1000);
  }
}

// Create a test workflow for scheduling
async function createTestWorkflow() {
  const workflowId = uuidv4();
  
  await db.insert(workflows).values({
    id: workflowId,
    name: 'Simple Scheduler Test Workflow',
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
      startedBy: 'test-simple-scheduler',
      timestamp: new Date().toISOString()
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUpdated: new Date()
  });
  
  return workflowId;
}

// Clean up test workflow
async function cleanupTestWorkflow(workflowId) {
  await db.delete(workflows).where(eq(workflows.id, workflowId));
}

// Run the test
testSimpleScheduler();