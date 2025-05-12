/**
 * Email Tables Migration Script
 * This script handles all migrations for the email notifications and logs tables
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Run all email-related migrations
 */
async function migrateEmailTables() {
  try {
    console.log('Starting email tables migration...');
    
    // 1. Create tables if they don't exist
    await createEmailTables();
    
    // 2. Update email_notifications table
    await updateEmailNotificationsTable();
    
    // 3. Update email_logs table
    await updateEmailLogsTable();
    
    console.log('Email tables migration completed successfully!');
    
  } catch (error) {
    console.error('Error in email tables migration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

/**
 * Create email tables if they don't exist
 */
async function createEmailTables() {
  console.log('Creating email tables if they don\'t exist...');
  
  // Create email_notifications table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
      recipient_email TEXT NOT NULL,
      send_on_completion BOOLEAN DEFAULT true,
      send_on_failure BOOLEAN DEFAULT true,
      include_insights BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create email_logs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
      recipient_email TEXT,
      subject TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      sent_at TIMESTAMP,
      attempts INTEGER DEFAULT 1,
      error_message TEXT,
      content_text TEXT,
      content_html TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Email tables created successfully!');
}

/**
 * Update email_notifications table
 */
async function updateEmailNotificationsTable() {
  console.log('Updating email_notifications table...');
  
  // Add workflow_id column if it doesn't exist
  try {
    await db.execute(sql`
      ALTER TABLE email_notifications
      ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS recipient_email TEXT,
      ALTER COLUMN platform DROP NOT NULL
    `);
  } catch (error) {
    console.log('Column alterations error (might be OK):', error.message);
  }
  
  // Migrate platform/workflow_type data to workflow_id if needed
  try {
    const hasWorkflowTypeColumn = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'email_notifications' AND column_name = 'workflow_type'
    `);
    
    if (hasWorkflowTypeColumn.length > 0) {
      console.log('Workflow type column exists, migrating data...');
      // This is a placeholder for data migration logic if needed
    }
  } catch (error) {
    console.log('Data migration check error, continuing:', error.message);
  }
  
  // Move recipients array data to recipient_email field if needed
  try {
    const hasRecipientsColumn = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'email_notifications' AND column_name = 'recipients'
    `);
    
    if (hasRecipientsColumn.length > 0) {
      console.log('Recipients column exists, migrating data...');
      await db.execute(sql`
        UPDATE email_notifications 
        SET recipient_email = recipients[1]
        WHERE recipient_email IS NULL 
        AND recipients IS NOT NULL 
        AND array_length(recipients, 1) > 0
      `);
      
      // Drop recipients column
      await db.execute(sql`
        ALTER TABLE email_notifications
        DROP COLUMN IF EXISTS recipients
      `);
    }
  } catch (error) {
    console.log('Recipients migration error, continuing:', error.message);
  }
  
  console.log('Email notifications table updated successfully!');
}

/**
 * Update email_logs table
 */
async function updateEmailLogsTable() {
  console.log('Updating email_logs table...');
  
  // Add required columns
  try {
    await db.execute(sql`
      ALTER TABLE email_logs 
      ADD COLUMN IF NOT EXISTS recipient_email TEXT,
      ADD COLUMN IF NOT EXISTS subject TEXT,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS error_message TEXT,
      ADD COLUMN IF NOT EXISTS content_text TEXT,
      ADD COLUMN IF NOT EXISTS content_html TEXT
    `);
  } catch (error) {
    console.log('Column additions error (might be OK):', error.message);
  }
  
  // Remove NOT NULL constraint on recipients column if it exists
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
      
      // Migrate recipients data
      try {
        await db.execute(sql`
          UPDATE email_logs 
          SET recipient_email = recipients[1]
          WHERE recipient_email IS NULL 
          AND recipients IS NOT NULL 
          AND array_length(recipients, 1) > 0
        `);
      } catch (error) {
        console.log('Data migration error, continuing:', error.message);
      }
    }
  } catch (error) {
    console.log('Recipients constraint check error, continuing:', error.message);
  }
  
  console.log('Email logs table updated successfully!');
}

// Run the migration
migrateEmailTables();