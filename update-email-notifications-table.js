/**
 * Update Email Notifications Table Script
 * This script updates the email_notifications table structure to match the new schema
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { emailNotifications } from './dist/shared/schema.js';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Update email notifications table to add workflow_id column
 */
async function updateEmailNotificationsTable() {
  try {
    console.log('Checking if email_notifications table exists...');
    
    // Add workflow_id column if it doesn't exist
    console.log('Adding workflow_id column to email_notifications table...');
    await db.execute(sql`
      ALTER TABLE email_notifications 
      ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS recipient_email TEXT
    `);
    
    // Remove platform and workflow_type columns if they exist
    console.log('Removing old columns from email_notifications table...');
    try {
      await db.execute(sql`
        ALTER TABLE email_notifications 
        DROP COLUMN IF EXISTS platform,
        DROP COLUMN IF EXISTS workflow_type
      `);
    } catch (error) {
      console.log('Old columns might not exist, continuing:', error.message);
    }

    // Move recipients array data to recipient_email field
    console.log('Checking if recipients column exists to migrate data...');
    try {
      const hasRecipientsColumn = await db.execute(sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'email_notifications' AND column_name = 'recipients'
      `);
      
      if (hasRecipientsColumn.length > 0) {
        console.log('Migrating data from recipients array to recipient_email field...');
        await db.execute(sql`
          UPDATE email_notifications 
          SET recipient_email = recipients[1]
          WHERE recipient_email IS NULL 
          AND recipients IS NOT NULL 
          AND array_length(recipients, 1) > 0
        `);
        
        console.log('Removing recipients column...');
        await db.execute(sql`
          ALTER TABLE email_notifications 
          DROP COLUMN IF EXISTS recipients
        `);
      }
    } catch (error) {
      console.log('Data migration error, continuing:', error.message);
    }
    
    console.log('Email notifications table updated successfully!');
    
  } catch (error) {
    console.error('Error updating email_notifications table:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
updateEmailNotificationsTable();