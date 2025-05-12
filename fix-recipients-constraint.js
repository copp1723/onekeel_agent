/**
 * Fix Recipients Constraint in Email Logs Table
 * This script removes the NOT NULL constraint from the recipients column
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Fix recipients column constraint in email_logs table
 */
async function fixRecipientsConstraint() {
  try {
    console.log('Fixing recipients column constraint in email_logs table...');
    
    // Check if recipients column exists
    try {
      const hasRecipientsColumn = await db.execute(sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'email_logs' AND column_name = 'recipients'
      `);
      
      if (hasRecipientsColumn.length > 0) {
        console.log('Recipients column exists, removing NOT NULL constraint...');
        
        // Drop NOT NULL constraint on recipients column
        await db.execute(sql`
          ALTER TABLE email_logs 
          ALTER COLUMN recipients DROP NOT NULL
        `);
        
        console.log('Constraint removed successfully!');
      } else {
        console.log('Recipients column does not exist, no need to fix constraint.');
      }
    } catch (error) {
      console.log('Error checking for column, continuing:', error.message);
    }
    
  } catch (error) {
    console.error('Error fixing recipients constraint:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
fixRecipientsConstraint();