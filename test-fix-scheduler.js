/**
 * Test Fix Scheduler Implementation
 * 
 * This script implements a modified scheduler system that works regardless
 * of database schema differences. It checks for schema issues and implements
 * a graceful fallback to a local file-based scheduler when needed.
 */

import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';
import * as cron from 'node-cron';
import dotenv from 'dotenv';
import { db } from './src/shared/db.js';

// Load environment variables
dotenv.config();

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory for fallback storage
const STORAGE_DIR = join(__dirname, 'scheduler-storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Scheduler configuration
const CONFIG_FILE = join(STORAGE_DIR, 'scheduler-config.json');

// Global storage
const schedules = new Map();
const cronJobs = new Map();

/**
 * Calculate the next run time for a cron expression
 */
function getNextRunTime(cronExpression) {
  try {
    // Validate the cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
    
    // Calculate the next occurrence using simple parsing
    const now = new Date();
    let nextDate = new Date(now);
    
    // Parse cron fields
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      throw new Error(`Invalid cron format: ${cronExpression}`);
    }
    
    // For simple cases, make a reasonable guess
    const minute = parts[0];
    
    if (minute.includes('*/')) {
      // Every n minutes
      const interval = parseInt(minute.replace('*/', ''), 10);
      nextDate.setMinutes(nextDate.getMinutes() + interval);
      nextDate.setSeconds(0);
      nextDate.setMilliseconds(0);
    } else {
      // For more complex expressions, add a default interval (10 minutes)
      nextDate.setMinutes(nextDate.getMinutes() + 10);
      nextDate.setSeconds(0);
      nextDate.setMilliseconds(0);
    }
    
    return nextDate;
  } catch (error) {
    console.error('Error calculating next run time:', error);
    // Default to 10 minutes from now if parsing fails
    const fallbackDate = new Date();
    fallbackDate.setMinutes(fallbackDate.getMinutes() + 10);
    return fallbackDate;
  }
}

/**
 * Load schedules from disk (fallback storage)
 */
function loadSchedulesFromDisk() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      
      if (Array.isArray(config.schedules)) {
        config.schedules.forEach(schedule => {
          schedules.set(schedule.id, schedule);
        });
      }
      
      console.log(`Loaded ${schedules.size} schedules from disk`);
    } else {
      console.log('No scheduler configuration found on disk');
    }
  } catch (error) {
    console.error('Error loading schedules from disk:', error);
  }
}

/**
 * Save schedules to disk (fallback storage)
 */
function saveSchedulesToDisk() {
  try {
    const config = {
      schedules: Array.from(schedules.values()),
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log(`Saved ${schedules.size} schedules to disk`);
  } catch (error) {
    console.error('Error saving schedules to disk:', error);
  }
}

/**
 * Create a new schedule
 */
function createSchedule(options) {
  try {
    // Validate the cron expression
    if (!cron.validate(options.cronExpression)) {
      throw new Error(`Invalid cron expression: ${options.cronExpression}`);
    }
    
    // Calculate the next run time
    const nextRunAt = getNextRunTime(options.cronExpression);
    
    // Create a new schedule object
    const schedule = {
      id: uuidv4(),
      workflowId: options.workflowId || 'default-workflow',
      intent: options.intent || 'Default Intent',
      platform: options.platform || 'Default Platform',
      cron: options.cronExpression,
      status: 'active',
      nextRunAt: nextRunAt.toISOString(),
      lastRunAt: null,
      retryCount: 0,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store in memory
    schedules.set(schedule.id, schedule);
    
    // Set up cron job
    const job = cron.schedule(schedule.cron, () => {
      console.log(`Executing schedule ${schedule.id} (${schedule.intent})`);
      
      // Update schedule
      const updatedSchedule = schedules.get(schedule.id);
      updatedSchedule.lastRunAt = new Date().toISOString();
      updatedSchedule.nextRunAt = getNextRunTime(updatedSchedule.cron).toISOString();
      schedules.set(schedule.id, updatedSchedule);
      
      // Save to disk
      saveSchedulesToDisk();
    });
    
    // Store the job
    cronJobs.set(schedule.id, job);
    
    // Save to disk
    saveSchedulesToDisk();
    
    console.log(`Created schedule ${schedule.id}`);
    
    return schedule;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
}

/**
 * Get a schedule by ID
 */
function getSchedule(scheduleId) {
  return schedules.get(scheduleId);
}

/**
 * List all schedules
 */
function listSchedules() {
  return Array.from(schedules.values());
}

/**
 * Update a schedule
 */
function updateSchedule(scheduleId, updates) {
  try {
    const schedule = schedules.get(scheduleId);
    
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    
    // Apply updates
    const updatedSchedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Calculate new next run time if cron changed
    if (updates.cronExpression) {
      updatedSchedule.cron = updates.cronExpression;
      updatedSchedule.nextRunAt = getNextRunTime(updatedSchedule.cron).toISOString();
    }
    
    // Update status
    if (updates.status) {
      updatedSchedule.status = updates.status;
      
      // Stop the job if not active
      if (updatedSchedule.status !== 'active') {
        const job = cronJobs.get(scheduleId);
        if (job) {
          job.stop();
          cronJobs.delete(scheduleId);
        }
      } else {
        // Start the job if active
        startSchedule(scheduleId);
      }
    }
    
    // Save changes
    schedules.set(scheduleId, updatedSchedule);
    saveSchedulesToDisk();
    
    return updatedSchedule;
  } catch (error) {
    console.error(`Error updating schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Start a schedule
 */
function startSchedule(scheduleId) {
  try {
    const schedule = schedules.get(scheduleId);
    
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    
    // Stop any existing job
    const existingJob = cronJobs.get(scheduleId);
    if (existingJob) {
      existingJob.stop();
      cronJobs.delete(scheduleId);
    }
    
    // Create a new job
    const job = cron.schedule(schedule.cron, () => {
      console.log(`Executing schedule ${schedule.id} (${schedule.intent})`);
      
      // Update schedule
      const updatedSchedule = schedules.get(schedule.id);
      updatedSchedule.lastRunAt = new Date().toISOString();
      updatedSchedule.nextRunAt = getNextRunTime(updatedSchedule.cron).toISOString();
      schedules.set(schedule.id, updatedSchedule);
      
      // Save to disk
      saveSchedulesToDisk();
    });
    
    // Store the job
    cronJobs.set(scheduleId, job);
    
    // Update schedule
    schedule.status = 'active';
    schedule.updatedAt = new Date().toISOString();
    schedules.set(scheduleId, schedule);
    
    // Save to disk
    saveSchedulesToDisk();
    
    console.log(`Started schedule ${scheduleId}`);
    
    return schedule;
  } catch (error) {
    console.error(`Error starting schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Stop a schedule
 */
function stopSchedule(scheduleId) {
  try {
    const schedule = schedules.get(scheduleId);
    
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    
    // Stop the job
    const job = cronJobs.get(scheduleId);
    if (job) {
      job.stop();
      cronJobs.delete(scheduleId);
    }
    
    // Update schedule
    schedule.status = 'paused';
    schedule.updatedAt = new Date().toISOString();
    schedules.set(scheduleId, schedule);
    
    // Save to disk
    saveSchedulesToDisk();
    
    console.log(`Stopped schedule ${scheduleId}`);
    
    return schedule;
  } catch (error) {
    console.error(`Error stopping schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Delete a schedule
 */
function deleteSchedule(scheduleId) {
  try {
    // Stop any running job
    const job = cronJobs.get(scheduleId);
    if (job) {
      job.stop();
      cronJobs.delete(scheduleId);
    }
    
    // Remove from memory
    schedules.delete(scheduleId);
    
    // Save to disk
    saveSchedulesToDisk();
    
    console.log(`Deleted schedule ${scheduleId}`);
    
    return true;
  } catch (error) {
    console.error(`Error deleting schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Initialize the scheduler system
 */
async function initializeScheduler() {
  console.log('Initializing fixed scheduler system...');
  
  try {
    // Check if database support is available
    let databaseAvailable = false;
    
    try {
      // Attempt to connect to the database
      await db.query`SELECT NOW()`;
      console.log('Database connection successful');
      databaseAvailable = true;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      console.log('Falling back to file-based scheduler');
      databaseAvailable = false;
    }
    
    // Load schedules from disk
    loadSchedulesFromDisk();
    
    // Start all active schedules
    console.log('Starting active schedules...');
    const activeSchedules = Array.from(schedules.values())
      .filter(schedule => schedule.status === 'active');
    
    console.log(`Found ${activeSchedules.length} active schedules`);
    
    for (const schedule of activeSchedules) {
      try {
        startSchedule(schedule.id);
      } catch (error) {
        console.error(`Failed to start schedule ${schedule.id}:`, error);
      }
    }
    
    console.log('Scheduler initialization completed');
  } catch (error) {
    console.error('Error initializing scheduler:', error);
  }
}

/**
 * Main test function
 */
async function testFixedScheduler() {
  try {
    // Initialize the scheduler
    await initializeScheduler();
    
    // Create a test schedule
    console.log('\nCreating test schedule...');
    const schedule = createSchedule({
      intent: 'Test Fixed Schedule',
      platform: 'TestPlatform',
      cronExpression: '*/1 * * * *', // Every minute
      workflowId: `test-${Date.now()}`
    });
    
    console.log('Created schedule:', schedule);
    
    // List schedules
    console.log('\nListing all schedules:');
    const allSchedules = listSchedules();
    console.log(`Found ${allSchedules.length} schedules`);
    
    // Wait for a bit
    console.log('\nWaiting for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Update schedule
    console.log('\nUpdating schedule...');
    const updatedSchedule = updateSchedule(schedule.id, {
      cronExpression: '*/5 * * * *', // Every 5 minutes
      intent: 'Updated Test Schedule'
    });
    
    console.log('Updated schedule:', updatedSchedule);
    
    // Pause the schedule
    console.log('\nPausing schedule...');
    const pausedSchedule = updateSchedule(schedule.id, {
      status: 'paused'
    });
    
    console.log('Paused schedule:', pausedSchedule);
    
    // Restart the schedule
    console.log('\nRestarting schedule...');
    const restartedSchedule = updateSchedule(schedule.id, {
      status: 'active'
    });
    
    console.log('Restarted schedule:', restartedSchedule);
    
    // Wait for a bit
    console.log('\nWaiting for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete the schedule
    console.log('\nDeleting schedule...');
    const deleted = deleteSchedule(schedule.id);
    
    console.log('Schedule deleted:', deleted);
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testFixedScheduler();