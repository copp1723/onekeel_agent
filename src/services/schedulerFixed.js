/**
 * Enhanced Scheduler Service with Database Fallback
 * 
 * This scheduler service provides reliable scheduling functionality with automatic fallback:
 * 1. First attempts to use the database for persistent storage
 * 2. Gracefully falls back to file-based storage if DB access fails
 * 3. Provides robust error handling and recovery
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as cron from 'node-cron';
import { db } from '../shared/db.js';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory for fallback storage
const STORAGE_DIR = join(__dirname, '../../scheduler-storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Scheduler configuration
const CONFIG_FILE = join(STORAGE_DIR, 'scheduler-config.json');

// Global storage
const schedules = new Map();
const cronJobs = new Map();

// Tracks whether we're using database or file storage
let useDatabase = true;

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
  } catch (error) {
    console.error('Error saving schedules to disk:', error);
  }
}

/**
 * Load schedules from database
 */
async function loadSchedulesFromDB() {
  try {
    if (!useDatabase) return;
    
    const allSchedules = await db.unsafe('SELECT * FROM schedules');
    
    allSchedules.forEach(dbSchedule => {
      const schedule = {
        id: dbSchedule.id,
        workflowId: dbSchedule.workflow_id,
        intent: dbSchedule.intent || 'Default Intent',
        platform: dbSchedule.platform || 'Default Platform',
        cron: dbSchedule.cron,
        status: dbSchedule.status || 'active',
        nextRunAt: dbSchedule.next_run_at ? new Date(dbSchedule.next_run_at).toISOString() : null,
        lastRunAt: dbSchedule.last_run_at ? new Date(dbSchedule.last_run_at).toISOString() : null,
        retryCount: dbSchedule.retry_count || 0,
        lastError: dbSchedule.last_error || null,
        enabled: dbSchedule.enabled || false,
        createdAt: dbSchedule.created_at ? new Date(dbSchedule.created_at).toISOString() : new Date().toISOString(),
        updatedAt: dbSchedule.updated_at ? new Date(dbSchedule.updated_at).toISOString() : new Date().toISOString()
      };
      
      schedules.set(schedule.id, schedule);
    });
    
    console.log(`Loaded ${schedules.size} schedules from database`);
  } catch (error) {
    console.error('Error loading schedules from database:', error);
    console.log('Falling back to file-based storage...');
    useDatabase = false;
    loadSchedulesFromDisk();
  }
}

/**
 * Create a new schedule
 */
export async function createSchedule(options) {
  try {
    // Validate options
    if (!options.intent) {
      throw new Error('Intent is required');
    }
    
    if (!options.platform) {
      throw new Error('Platform is required');
    }
    
    if (!options.cronExpression) {
      throw new Error('Cron expression is required');
    }
    
    // Validate the cron expression
    if (!cron.validate(options.cronExpression)) {
      throw new Error(`Invalid cron expression: ${options.cronExpression}`);
    }
    
    // Calculate the next run time
    const nextRunAt = getNextRunTime(options.cronExpression);
    
    // Create a new schedule object
    const scheduleId = uuidv4();
    const schedule = {
      id: scheduleId,
      workflowId: options.workflowId || null,
      intent: options.intent,
      platform: options.platform,
      cron: options.cronExpression,
      status: 'active',
      nextRunAt: nextRunAt.toISOString(),
      lastRunAt: null,
      retryCount: 0,
      lastError: null,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Try to store in database first
    if (useDatabase) {
      try {
        await db.unsafe(`
          INSERT INTO schedules (
            id, workflow_id, intent, platform, cron, 
            status, next_run_at, last_run_at, retry_count, 
            last_error, enabled, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
        `, [
          schedule.id,
          schedule.workflowId,
          schedule.intent,
          schedule.platform,
          schedule.cron,
          schedule.status,
          schedule.nextRunAt,
          schedule.lastRunAt,
          schedule.retryCount,
          schedule.lastError,
          schedule.enabled,
          schedule.createdAt,
          schedule.updatedAt
        ]);
      } catch (error) {
        console.error('Error storing schedule in database:', error);
        console.log('Falling back to file-based storage...');
        useDatabase = false;
      }
    }
    
    // Store in memory
    schedules.set(schedule.id, schedule);
    
    // Set up cron job
    const job = cron.schedule(schedule.cron, async () => {
      console.log(`Executing schedule ${schedule.id} (${schedule.intent})`);
      
      try {
        // Execute the scheduled task
        // This would be replaced with actual workflow execution
        console.log(`Simulating workflow execution for ${schedule.workflowId}`);
        
        // Update schedule
        const updatedSchedule = schedules.get(schedule.id);
        updatedSchedule.lastRunAt = new Date().toISOString();
        updatedSchedule.nextRunAt = getNextRunTime(updatedSchedule.cron).toISOString();
        schedules.set(schedule.id, updatedSchedule);
        
        // Update in database if available
        if (useDatabase) {
          try {
            await db.unsafe(`
              UPDATE schedules
              SET last_run_at = $1, next_run_at = $2, updated_at = $3
              WHERE id = $4
            `, [
              updatedSchedule.lastRunAt,
              updatedSchedule.nextRunAt,
              new Date().toISOString(),
              updatedSchedule.id
            ]);
          } catch (error) {
            console.error('Error updating schedule in database:', error);
            console.log('Falling back to file-based storage...');
            useDatabase = false;
            saveSchedulesToDisk();
          }
        } else {
          // Save to disk
          saveSchedulesToDisk();
        }
      } catch (error) {
        console.error(`Error executing schedule ${schedule.id}:`, error);
        
        // Update error information
        const failedSchedule = schedules.get(schedule.id);
        failedSchedule.status = 'failed';
        failedSchedule.lastError = error.message;
        failedSchedule.retryCount = (failedSchedule.retryCount || 0) + 1;
        failedSchedule.updatedAt = new Date().toISOString();
        schedules.set(schedule.id, failedSchedule);
        
        // Update in database if available
        if (useDatabase) {
          try {
            await db.unsafe(`
              UPDATE schedules
              SET status = $1, last_error = $2, retry_count = $3, updated_at = $4
              WHERE id = $5
            `, [
              failedSchedule.status,
              failedSchedule.lastError,
              failedSchedule.retryCount,
              failedSchedule.updatedAt,
              failedSchedule.id
            ]);
          } catch (dbError) {
            console.error('Error updating schedule error in database:', dbError);
            console.log('Falling back to file-based storage...');
            useDatabase = false;
            saveSchedulesToDisk();
          }
        } else {
          // Save to disk
          saveSchedulesToDisk();
        }
      }
    });
    
    // Store the job
    cronJobs.set(schedule.id, job);
    
    // If using file storage, save to disk
    if (!useDatabase) {
      saveSchedulesToDisk();
    }
    
    return schedule;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
}

/**
 * Get a schedule by ID
 */
export async function getSchedule(scheduleId) {
  // Try database first if enabled
  if (useDatabase) {
    try {
      const [result] = await db.unsafe('SELECT * FROM schedules WHERE id = $1', [scheduleId]);
      
      if (result) {
        return {
          id: result.id,
          workflowId: result.workflow_id,
          intent: result.intent || 'Default Intent',
          platform: result.platform || 'Default Platform',
          cron: result.cron,
          status: result.status || 'active',
          nextRunAt: result.next_run_at ? new Date(result.next_run_at).toISOString() : null,
          lastRunAt: result.last_run_at ? new Date(result.last_run_at).toISOString() : null,
          retryCount: result.retry_count || 0,
          lastError: result.last_error || null,
          enabled: result.enabled || false,
          createdAt: result.created_at ? new Date(result.created_at).toISOString() : null,
          updatedAt: result.updated_at ? new Date(result.updated_at).toISOString() : null
        };
      }
    } catch (error) {
      console.error('Error getting schedule from database:', error);
      console.log('Falling back to in-memory storage...');
    }
  }
  
  // Fall back to in-memory
  return schedules.get(scheduleId);
}

/**
 * List all schedules with optional filters
 */
export async function listSchedules(filters = {}) {
  // Try database first if enabled
  if (useDatabase) {
    try {
      let query = 'SELECT * FROM schedules';
      const params = [];
      const conditions = [];
      
      if (filters.status) {
        conditions.push('status = $' + (params.length + 1));
        params.push(filters.status);
      }
      
      if (filters.platform) {
        conditions.push('platform = $' + (params.length + 1));
        params.push(filters.platform);
      }
      
      if (filters.intent) {
        conditions.push('intent ILIKE $' + (params.length + 1));
        params.push(`%${filters.intent}%`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC';
      
      const results = await db.unsafe(query, params);
      
      return results.map(result => ({
        id: result.id,
        workflowId: result.workflow_id,
        intent: result.intent,
        platform: result.platform,
        cron: result.cron,
        status: result.status,
        nextRunAt: result.next_run_at ? new Date(result.next_run_at).toISOString() : null,
        lastRunAt: result.last_run_at ? new Date(result.last_run_at).toISOString() : null,
        retryCount: result.retry_count || 0,
        lastError: result.last_error,
        enabled: result.enabled,
        createdAt: result.created_at ? new Date(result.created_at).toISOString() : null,
        updatedAt: result.updated_at ? new Date(result.updated_at).toISOString() : null
      }));
    } catch (error) {
      console.error('Error listing schedules from database:', error);
      console.log('Falling back to in-memory storage...');
    }
  }
  
  // Fall back to in-memory
  let filteredSchedules = Array.from(schedules.values());
  
  if (filters.status) {
    filteredSchedules = filteredSchedules.filter(s => s.status === filters.status);
  }
  
  if (filters.platform) {
    filteredSchedules = filteredSchedules.filter(s => s.platform === filters.platform);
  }
  
  if (filters.intent) {
    const intentLower = filters.intent.toLowerCase();
    filteredSchedules = filteredSchedules.filter(s => 
      s.intent.toLowerCase().includes(intentLower)
    );
  }
  
  return filteredSchedules.sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * Update a schedule
 */
export async function updateSchedule(scheduleId, updates) {
  try {
    // Get current schedule
    const schedule = await getSchedule(scheduleId);
    
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    
    // Apply updates
    const updatedSchedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Handle cron expression change
    if (updates.cronExpression) {
      // Validate the cron expression
      if (!cron.validate(updates.cronExpression)) {
        throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
      }
      
      updatedSchedule.cron = updates.cronExpression;
      updatedSchedule.nextRunAt = getNextRunTime(updatedSchedule.cron).toISOString();
      
      // Update the cron job
      const existingJob = cronJobs.get(scheduleId);
      if (existingJob) {
        existingJob.stop();
      }
      
      if (updatedSchedule.status === 'active') {
        const job = cron.schedule(updatedSchedule.cron, () => {
          console.log(`Executing schedule ${updatedSchedule.id} (${updatedSchedule.intent})`);
          // Schedule execution logic would go here
        });
        cronJobs.set(scheduleId, job);
      }
    }
    
    // Handle status change
    if (updates.status) {
      updatedSchedule.status = updates.status;
      
      // Update the cron job based on status
      const existingJob = cronJobs.get(scheduleId);
      
      if (updatedSchedule.status !== 'active') {
        // Stop the job if not active
        if (existingJob) {
          existingJob.stop();
          cronJobs.delete(scheduleId);
        }
      } else if (!existingJob) {
        // Start new job if status is now active
        const job = cron.schedule(updatedSchedule.cron, () => {
          console.log(`Executing schedule ${updatedSchedule.id} (${updatedSchedule.intent})`);
          // Schedule execution logic would go here
        });
        cronJobs.set(scheduleId, job);
      }
    }
    
    // Update in database if enabled
    if (useDatabase) {
      try {
        let query = 'UPDATE schedules SET updated_at = $1';
        const params = [updatedSchedule.updatedAt, scheduleId];
        let paramIndex = 3;
        
        if (updates.intent) {
          query += `, intent = $${paramIndex++}`;
          params.splice(params.length - 1, 0, updatedSchedule.intent);
        }
        
        if (updates.platform) {
          query += `, platform = $${paramIndex++}`;
          params.splice(params.length - 1, 0, updatedSchedule.platform);
        }
        
        if (updates.cronExpression) {
          query += `, cron = $${paramIndex++}, next_run_at = $${paramIndex++}`;
          params.splice(params.length - 1, 0, updatedSchedule.cron, updatedSchedule.nextRunAt);
        }
        
        if (updates.status) {
          query += `, status = $${paramIndex++}`;
          params.splice(params.length - 1, 0, updatedSchedule.status);
        }
        
        if (typeof updates.enabled !== 'undefined') {
          query += `, enabled = $${paramIndex++}`;
          params.splice(params.length - 1, 0, updatedSchedule.enabled);
        }
        
        query += ' WHERE id = $2';
        
        await db.unsafe(query, params);
      } catch (error) {
        console.error('Error updating schedule in database:', error);
        console.log('Falling back to in-memory storage...');
        useDatabase = false;
      }
    }
    
    // Update in memory
    schedules.set(scheduleId, updatedSchedule);
    
    // Save to disk if not using database
    if (!useDatabase) {
      saveSchedulesToDisk();
    }
    
    return updatedSchedule;
  } catch (error) {
    console.error(`Error updating schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Start a schedule
 */
export async function startSchedule(scheduleId) {
  try {
    // Update status to active
    return await updateSchedule(scheduleId, { status: 'active', enabled: true });
  } catch (error) {
    console.error(`Error starting schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Stop a schedule
 */
export async function stopSchedule(scheduleId) {
  try {
    // Update status to paused
    return await updateSchedule(scheduleId, { status: 'paused', enabled: false });
  } catch (error) {
    console.error(`Error stopping schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId) {
  try {
    // Stop any running job
    const job = cronJobs.get(scheduleId);
    if (job) {
      job.stop();
      cronJobs.delete(scheduleId);
    }
    
    // Delete from database if enabled
    if (useDatabase) {
      try {
        await db.unsafe('DELETE FROM schedules WHERE id = $1', [scheduleId]);
      } catch (error) {
        console.error('Error deleting schedule from database:', error);
        console.log('Falling back to in-memory storage...');
        useDatabase = false;
      }
    }
    
    // Remove from memory
    schedules.delete(scheduleId);
    
    // Save to disk if not using database
    if (!useDatabase) {
      saveSchedulesToDisk();
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Retry a failed schedule
 */
export async function retrySchedule(scheduleId) {
  try {
    // Get current schedule
    const schedule = await getSchedule(scheduleId);
    
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    
    // Reset error state
    const updatedSchedule = {
      ...schedule,
      status: 'active',
      lastError: null,
      retryCount: 0,
      updatedAt: new Date().toISOString()
    };
    
    // Update in database if enabled
    if (useDatabase) {
      try {
        await db.unsafe(`
          UPDATE schedules
          SET status = $1, last_error = $2, retry_count = $3, updated_at = $4
          WHERE id = $5
        `, [
          updatedSchedule.status,
          updatedSchedule.lastError,
          updatedSchedule.retryCount,
          updatedSchedule.updatedAt,
          updatedSchedule.id
        ]);
      } catch (error) {
        console.error('Error retrying schedule in database:', error);
        console.log('Falling back to in-memory storage...');
        useDatabase = false;
      }
    }
    
    // Update in memory
    schedules.set(scheduleId, updatedSchedule);
    
    // Save to disk if not using database
    if (!useDatabase) {
      saveSchedulesToDisk();
    }
    
    return updatedSchedule;
  } catch (error) {
    console.error(`Error retrying schedule ${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Initialize the scheduler system
 */
export async function initializeScheduler() {
  console.log('Initializing enhanced scheduler service...');
  
  try {
    // Check if database support is available
    try {
      // Attempt to connect to the database and check for schedules table
      await db.unsafe('SELECT 1 FROM schedules LIMIT 1');
      console.log('Database connection successful');
      useDatabase = true;
      
      // Load schedules from database
      await loadSchedulesFromDB();
    } catch (error) {
      console.error('Error initializing scheduler with database:', error.message);
      console.log('Failed to initialize scheduler with database but application will continue');
      useDatabase = false;
      
      // Load schedules from disk
      loadSchedulesFromDisk();
    }
    
    // Start all active schedules
    console.log('Starting active schedules...');
    const activeSchedules = Array.from(schedules.values())
      .filter(schedule => schedule.status === 'active');
    
    console.log(`Found ${activeSchedules.length} active schedules`);
    
    for (const schedule of activeSchedules) {
      try {
        const job = cron.schedule(schedule.cron, async () => {
          console.log(`Executing schedule ${schedule.id} (${schedule.intent})`);
          
          // This would be replaced with actual workflow execution
          console.log(`Simulating workflow execution for ${schedule.workflowId}`);
          
          // Update schedule
          const updatedSchedule = schedules.get(schedule.id);
          updatedSchedule.lastRunAt = new Date().toISOString();
          updatedSchedule.nextRunAt = getNextRunTime(updatedSchedule.cron).toISOString();
          schedules.set(schedule.id, updatedSchedule);
          
          // Update in database if available
          if (useDatabase) {
            try {
              await db.unsafe(`
                UPDATE schedules
                SET last_run_at = $1, next_run_at = $2, updated_at = $3
                WHERE id = $4
              `, [
                updatedSchedule.lastRunAt,
                updatedSchedule.nextRunAt,
                new Date().toISOString(),
                updatedSchedule.id
              ]);
            } catch (error) {
              console.error('Error updating schedule in database:', error);
              console.log('Falling back to file-based storage...');
              useDatabase = false;
              saveSchedulesToDisk();
            }
          } else {
            // Save to disk
            saveSchedulesToDisk();
          }
        });
        
        cronJobs.set(schedule.id, job);
      } catch (error) {
        console.error(`Failed to start schedule ${schedule.id}:`, error);
      }
    }
    
    console.log('Scheduler initialization completed');
  } catch (error) {
    console.error('Error initializing scheduler:', error);
    console.log('Failed to initialize scheduler but application will continue');
  }
}