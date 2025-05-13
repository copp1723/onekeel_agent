/**
 * Fix Invalid Schedules Script
 * This script cleans up any invalid schedules in the database that cause cron errors
 */

import { db } from './dist/shared/db.js';
import { schedules } from './dist/shared/schema.js';
import cron from 'node-cron';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Fix invalid schedule entries
 */
async function fixInvalidSchedules() {
  try {
    console.log('Connecting to database...');
    
    // First check for any invalid cron expressions
    console.log('Checking for invalid schedules...');
    const allSchedules = await db.select().from(schedules);
    console.log(`Found ${allSchedules.length} schedules in total`);
    
    const invalidSchedules = [];
    
    for (const schedule of allSchedules) {
      // First simple validation
      try {
        if (!cron.validate(schedule.cron)) {
          invalidSchedules.push({
            id: schedule.id,
            cron: schedule.cron,
            reason: 'Invalid cron syntax'
          });
          continue;
        }
        
        // Try to set up a temporary task to see if it throws an error
        // We use a try/catch because some valid syntaxes might still cause runtime errors
        const tempTask = cron.schedule(schedule.cron, () => {
          // Do nothing, just testing initialization
        }, { timezone: "UTC" });
        
        // If it works, clean up the temp task
        tempTask.stop();
      } catch (error) {
        invalidSchedules.push({
          id: schedule.id,
          cron: schedule.cron,
          reason: error.message
        });
      }
    }
    
    if (invalidSchedules.length === 0) {
      console.log('No invalid schedules found. All schedules have valid cron expressions.');
      return;
    }
    
    console.log(`Found ${invalidSchedules.length} invalid schedules:`);
    console.table(invalidSchedules);
    
    // Disable the invalid schedules
    console.log('Disabling invalid schedules...');
    for (const schedule of invalidSchedules) {
      await db
        .update(schedules)
        .set({ 
          enabled: false,
          updatedAt: new Date()
        })
        .where(eq(schedules.id, schedule.id));
        
      console.log(`Disabled schedule: ${schedule.id}`);
    }
    
    console.log('Successfully disabled all invalid schedules.');
  } catch (error) {
    console.error('Error fixing invalid schedules:', error);
  }
}

// Run the function
fixInvalidSchedules();