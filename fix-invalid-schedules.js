/**
 * Fix Invalid Schedules Script
 * This script cleans up any invalid schedules in the database that cause cron errors
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { schedules } from './dist/shared/schema.js';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Fix invalid schedule entries
 */
async function fixInvalidSchedules() {
  try {
    console.log('Using Replit PostgreSQL environment variables for database connection');
    const dbString = process.env.DATABASE_URL || 
      `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
    console.log(`Connecting to database: ${dbString.replace(/:[^:]*@/, ':***@')}`);
    
    // Get all schedules
    const allSchedules = await db.select().from(schedules);
    console.log(`Found ${allSchedules.length} schedules`);
    
    // Check each schedule
    let invalidCount = 0;
    let fixedCount = 0;
    
    for (const schedule of allSchedules) {
      try {
        // Basic validation for the cron expression
        const cronExpression = schedule.cron;
        
        // Check if this is a valid cron expression
        const isValid = validateCronExpression(cronExpression);
        
        if (!isValid) {
          console.log(`Invalid cron expression: ${cronExpression} in schedule ${schedule.id}`);
          invalidCount++;
          
          // Disable this schedule
          await db
            .update(schedules)
            .set({
              enabled: false,
              updatedAt: new Date()
            })
            .where(eq(schedules.id, schedule.id));
          
          console.log(`Disabled schedule ${schedule.id}`);
          fixedCount++;
        }
      } catch (error) {
        console.log(`Error checking schedule ${schedule.id}:`, error.message);
        invalidCount++;
        
        // Disable this schedule
        await db
          .update(schedules)
          .set({
            enabled: false,
            updatedAt: new Date()
          })
          .where(eq(schedules.id, schedule.id));
        
        console.log(`Disabled schedule ${schedule.id} due to error`);
        fixedCount++;
      }
    }
    
    console.log(`Completed schedule check: ${invalidCount} invalid schedules found, ${fixedCount} schedules fixed`);
  } catch (error) {
    console.error('Error fixing invalid schedules:', error);
  }
}

// Basic validation for cron expressions
function validateCronExpression(expression) {
  if (!expression) return false;
  
  // Simple regex validation
  // Minutes, hours, day of month, month, day of week
  const cronRegex = /^(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)\s+(\*|[0-9,\-\*\/]+)$/;
  
  if (!cronRegex.test(expression)) {
    return false;
  }
  
  // Additional validation for each field
  const parts = expression.trim().split(/\s+/);
  
  // Minutes: 0-59
  if (!validateCronField(parts[0], 0, 59)) return false;
  
  // Hours: 0-23
  if (!validateCronField(parts[1], 0, 23)) return false;
  
  // Day of month: 1-31
  if (!validateCronField(parts[2], 1, 31)) return false;
  
  // Month: 1-12
  if (!validateCronField(parts[3], 1, 12)) return false;
  
  // Day of week: 0-6
  if (!validateCronField(parts[4], 0, 6)) return false;
  
  return true;
}

// Validate an individual cron field
function validateCronField(field, min, max) {
  // Wildcard is always valid
  if (field === '*') return true;
  
  // Check for valid ranges, steps, and lists
  // */n - step values
  if (field.startsWith('*/')) {
    const step = parseInt(field.substring(2), 10);
    return !isNaN(step) && step >= 1;
  }
  
  // n-m - range
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(v => parseInt(v, 10));
    return !isNaN(start) && !isNaN(end) && 
           start >= min && end <= max && start <= end;
  }
  
  // n,m,... - list
  if (field.includes(',')) {
    return field.split(',').every(v => {
      const num = parseInt(v, 10);
      return !isNaN(num) && num >= min && num <= max;
    });
  }
  
  // Simple number
  const num = parseInt(field, 10);
  return !isNaN(num) && num >= min && num <= max;
}

// Run the fix
fixInvalidSchedules();