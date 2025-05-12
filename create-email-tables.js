/**
 * Create Email Tables Script
 * This script creates the email_notifications and email_logs tables in the database
 */

import { db } from './dist/shared/db.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Create email tables if they don't exist
 */
async function createEmailTables() {
  try {
    console.log('Using Replit PostgreSQL environment variables for database connection');
    
    // Check if email_notifications table exists
    const notificationsExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'email_notifications'
      );
    `);
    
    if (!notificationsExists[0].exists) {
      console.log('Creating email_notifications table...');
      await db.execute(sql`
        CREATE TABLE email_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_type VARCHAR(255),
          platform VARCHAR(255),
          recipients TEXT[] NOT NULL,
          enabled BOOLEAN DEFAULT TRUE,
          send_on_completion BOOLEAN DEFAULT TRUE,
          send_on_failure BOOLEAN DEFAULT TRUE,
          include_insights BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('email_notifications table created successfully.');
    } else {
      console.log('email_notifications table already exists.');
    }
    
    // Check if email_logs table exists
    const logsExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'email_logs'
      );
    `);
    
    if (!logsExists[0].exists) {
      console.log('Creating email_logs table...');
      await db.execute(sql`
        CREATE TABLE email_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
          recipient_email TEXT NOT NULL,
          subject TEXT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          sent_at TIMESTAMP WITH TIME ZONE,
          error_message TEXT,
          recipients TEXT[],
          content_text TEXT,
          content_html TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('email_logs table created successfully.');
    } else {
      console.log('email_logs table already exists.');
    }
    
    // Add indices for better performance
    console.log('Adding indices...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_email_notifications_workflow_type ON email_notifications(workflow_type);
      CREATE INDEX IF NOT EXISTS idx_email_notifications_platform ON email_notifications(platform);
      CREATE INDEX IF NOT EXISTS idx_email_logs_workflow_id ON email_logs(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
    `);
    console.log('Indices created successfully.');
    
    console.log('Email tables setup completed successfully!');
  } catch (error) {
    console.error('Error creating email tables:', error);
    process.exit(1);
  }
}

// Run the script
createEmailTables();