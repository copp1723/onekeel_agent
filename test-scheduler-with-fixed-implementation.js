/**
 * Test Script for the Fixed Scheduler Implementation
 * 
 * This script tests the fixed scheduler implementation that uses
 * setInterval instead of node-cron to avoid the "Invalid time value" errors.
 * 
 * Usage: node test-scheduler-with-fixed-implementation.js
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { v4 as uuidv4 } from 'uuid';
import { workflows } from './dist/shared/schema.js';
import { eq } from 'drizzle-orm';
import { initializeMailer } from './dist/services/fixed-mailerService.js';

// Important: Import the fixed scheduler service
import * as schedulerService from './dist/services/fixed-schedulerService.js';

// Load environment variables
dotenv.config();

// Test the scheduler functionality
async function testScheduler() {
  try {
    console.log('Using Replit PostgreSQL environment variables for database connection');
    const dbString = process.env.DATABASE_URL || 
      `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
    console.log(`Connecting to database: ${dbString.replace(/:[^:]*@/, ':***@')}`);
    
    // Initialize the mailer service (needed for email notifications)
    await initializeMailer(process.env.SENDGRID_API_KEY);
    
    console.log('Testing Scheduler System with Fixed Implementation...');
    
    // Create a test workflow to schedule
    const workflowId = await createTestWorkflow();
    console.log(`Created test workflow: ${workflowId}`);
    
    try {
      // Initialize the scheduler (loads enabled schedules)
      await schedulerService.initializeScheduler();
      
      // Create a schedule
      console.log('Creating schedule...');
      const schedule = await schedulerService.createSchedule(
        workflowId,      // Workflow ID to execute
        '*/5 * * * *',   // Every 5 minutes (cron expression)
        {                // Options
          description: 'Test schedule',
          enabled: true  // Enable this schedule
        }
      );
      
      console.log('Schedule created successfully:', {
        id: schedule.id,
        workflowId: schedule.workflowId,
        cron: schedule.cron,
        enabled: schedule.enabled
      });
      
      // Get the schedule
      console.log('Getting schedule...');
      const retrievedSchedule = await schedulerService.getSchedule(schedule.id);
      
      console.log('Retrieved schedule:', {
        id: retrievedSchedule.id,
        workflowId: retrievedSchedule.workflowId,
        cron: retrievedSchedule.cron,
        enabled: retrievedSchedule.enabled
      });
      
      // List all schedules
      console.log('Listing all schedules...');
      const allSchedules = await schedulerService.listSchedules();
      console.log(`Found ${allSchedules.length} schedules`);
      
      // Update the schedule
      console.log('Updating schedule...');
      const updatedSchedule = await schedulerService.updateSchedule(
        schedule.id,
        {
          cronExpression: '*/10 * * * *',  // Every 10 minutes
          enabled: true
        }
      );
      
      console.log('Schedule updated successfully:', {
        id: updatedSchedule.id,
        workflowId: updatedSchedule.workflowId,
        cron: updatedSchedule.cron,
        enabled: updatedSchedule.enabled
      });
      
      // Wait a moment to allow the schedule to run
      console.log('Waiting 3 seconds before cleaning up...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Delete the schedule
      console.log('Deleting schedule...');
      await schedulerService.deleteSchedule(schedule.id);
      console.log('Schedule deleted successfully');
      
      // Clean up the test workflow
      await cleanupTestWorkflow(workflowId);
      console.log(`Test workflow ${workflowId} cleaned up`);
      
      console.log('✅ Scheduler test with fixed implementation completed successfully');
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
  }
}

// Create a test workflow for scheduling
async function createTestWorkflow() {
  const workflowId = uuidv4();
  
  await db.insert(workflows).values({
    id: workflowId,
    name: 'Test Scheduler Workflow',
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
      startedBy: 'test-scheduler-fixed',
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
testScheduler();