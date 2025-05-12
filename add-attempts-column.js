/**
 * Add Attempts Column to Email Logs Table
 * This script adds the attempts column to the email_logs table
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Add attempts column to email_logs table
 */
async function addAttemptsColumn() {
  try {
    console.log('Adding attempts column to email_logs table...');
    
    // Drop attempts column if it exists (to avoid conflict)
    try {
      await db.execute(sql`
        ALTER TABLE email_logs 
        DROP COLUMN IF EXISTS attempts
      `);
      console.log('Removed existing attempts column if it existed');
    } catch (error) {
      console.log('Error dropping column, continuing:', error.message);
    }
    
    // Add attempts column
    await db.execute(sql`
      ALTER TABLE email_logs 
      ADD COLUMN attempts INTEGER DEFAULT 1
    `);
    
    console.log('Attempts column added successfully!');
    
  } catch (error) {
    console.error('Error adding attempts column:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
addAttemptsColumn();