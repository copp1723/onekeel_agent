/**
 * Quick Test Script for the Simple Scheduler Implementation
 * 
 * This script tests the simplified scheduler implementation with shorter timeouts
 * Uses setInterval instead of node-cron to avoid the "Invalid time value" errors.
 * 
 * Usage: node test-scheduler-simple-short.js
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { v4 as uuidv4 } from 'uuid';
import { workflows } from './dist/shared/schema.js';
import { eq } from 'drizzle-orm';
import { initializeMailer } from './dist/services/fixed-mailerService.js';
import * as simpleScheduler from './dist/services/schedulerServiceSimple.js';

// Load environment variables
dotenv.config();

async function testSimpleSchedulerShort() {
  try {
    console.log('Using Replit PostgreSQL environment variables for database connection');
    const dbString = process.env.DATABASE_URL || 
      `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
    console.log(`Connecting to database: ${dbString.replace(/:[^:]*@/, ':***@')}`);
    
    // Initialize the mailer service
    await initializeMailer(process.env.SENDGRID_API_KEY);
    console.log('Mailer service initialized');
    
    console.log('Testing Simple Scheduler System (Short Version)...');
    
    // Create a test workflow
    const workflowId = await createTestWorkflow();
    console.log(`Created test workflow: ${workflowId}`);
    
    // Initialize the scheduler
    await simpleScheduler.initializeScheduler();
    console.log('Scheduler initialized');
    
    // Create a schedule
    console.log('Creating schedule...');
    const schedule = await simpleScheduler.createSchedule(
      workflowId,
      '*/5 * * * *', // Every 5 minutes
      { description: 'Test schedule' }
    );
    console.log('Schedule created:', schedule.id);
    
    // Update the schedule
    console.log('Updating schedule...');
    await simpleScheduler.updateSchedule(schedule.id, {
      cronExpression: '*/10 * * * *' // Every 10 minutes
    });
    console.log('Schedule updated');
    
    // Delete the schedule
    console.log('Deleting schedule...');
    await simpleScheduler.deleteSchedule(schedule.id);
    console.log('Schedule deleted');
    
    // Clean up the test workflow
    await cleanupTestWorkflow(workflowId);
    console.log(`Cleaned up workflow: ${workflowId}`);
    
    console.log('✅ Simple scheduler test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Create a test workflow
async function createTestWorkflow() {
  const workflowId = uuidv4();
  
  await db.insert(workflows).values({
    id: workflowId,
    name: 'Simple Scheduler Test',
    steps: [{ id: 'step1', name: 'Test Step', type: 'test', config: {} }],
    status: 'pending',
    currentStep: 0,
    context: { startedBy: 'test-script' },
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
testSimpleSchedulerShort();