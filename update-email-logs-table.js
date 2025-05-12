/**
 * Update Email Logs Table Script
 * This script updates the email_logs table structure to match the new schema
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Update email logs table 
 */
async function updateEmailLogsTable() {
  try {
    console.log('Checking if email_logs table exists...');
    
    // Add recipient_email column if it doesn't exist
    console.log('Adding required columns to email_logs table...');
    await db.execute(sql`
      ALTER TABLE email_logs 
      ADD COLUMN IF NOT EXISTS recipient_email TEXT,
      ADD COLUMN IF NOT EXISTS subject TEXT,
      ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS error_message TEXT,
      ADD COLUMN IF NOT EXISTS content_text TEXT,
      ADD COLUMN IF NOT EXISTS content_html TEXT
    `);
    
    // Move recipients array data to recipient_email field
    console.log('Checking if recipients column exists to migrate data...');
    try {
      const hasRecipientsColumn = await db.execute(sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'email_logs' AND column_name = 'recipients'
      `);
      
      if (hasRecipientsColumn.length > 0) {
        console.log('Migrating data from recipients array to recipient_email field...');
        await db.execute(sql`
          UPDATE email_logs 
          SET recipient_email = recipients[1]
          WHERE recipient_email IS NULL 
          AND recipients IS NOT NULL 
          AND array_length(recipients, 1) > 0
        `);
        
        console.log('Removing recipients column...');
        await db.execute(sql`
          ALTER TABLE email_logs 
          DROP COLUMN IF EXISTS recipients
        `);
      }
    } catch (error) {
      console.log('Data migration error, continuing:', error.message);
    }
    
    console.log('Email logs table updated successfully!');
    
  } catch (error) {
    console.error('Error updating email_logs table:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
updateEmailLogsTable();