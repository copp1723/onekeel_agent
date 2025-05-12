/**
 * Create Email Logs Table Script
 * This script creates the email_logs table in the database
 */

import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

// Load environment variables
dotenv.config();

// Initialize database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createEmailLogsTable() {
  console.log('Creating email_logs table...');
  
  try {
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if table exists
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_logs'
        );
      `;
      
      const tableExists = (await client.query(checkTableQuery)).rows[0].exists;
      
      if (!tableExists) {
        // Create email_logs table
        const createTableQuery = `
          CREATE TABLE email_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
            recipient_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
            error_message TEXT,
            attempts INTEGER NOT NULL DEFAULT 1,
            sent_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX email_logs_workflow_id_idx ON email_logs(workflow_id);
          CREATE INDEX email_logs_status_idx ON email_logs(status);
        `;
        
        await client.query(createTableQuery);
        console.log('Created email_logs table');
      } else {
        console.log('email_logs table already exists');
      }
      
      // Check if email_notifications table exists
      const checkNotificationsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_notifications'
        );
      `;
      
      const notificationsExists = (await client.query(checkNotificationsQuery)).rows[0].exists;
      
      if (!notificationsExists) {
        // Create email_notifications table for configuration
        const createNotificationsQuery = `
          CREATE TABLE email_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workflow_id UUID UNIQUE REFERENCES workflows(id) ON DELETE CASCADE,
            recipient_email TEXT NOT NULL,
            send_on_completion BOOLEAN NOT NULL DEFAULT TRUE,
            send_on_failure BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
          
          CREATE INDEX email_notifications_workflow_id_idx ON email_notifications(workflow_id);
        `;
        
        await client.query(createNotificationsQuery);
        console.log('Created email_notifications table');
      } else {
        console.log('email_notifications table already exists');
      }
      
      await client.query('COMMIT');
      console.log('Email notification tables created successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating email_logs tables:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run migration
createEmailLogsTable()
  .then(() => {
    console.log('Email logs migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });