/**
 * Create Email Logs Table Script
 * This script creates the email_logs table in the database
 */

import dotenv from 'dotenv';
import { db } from './dist/shared/db.js';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

async function createEmailLogsTable() {
  try {
    console.log('Creating email_logs table...');
    
    // Check if table exists first
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'email_logs'
      );
    `);
    
    if (tableExists.rows && tableExists.rows[0] && tableExists.rows[0].exists) {
      console.log('email_logs table already exists. Skipping creation.');
      return;
    }
    
    // Create the table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
        recipients JSONB NOT NULL,
        subject TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX idx_email_logs_workflow_id ON email_logs (workflow_id);
      CREATE INDEX idx_email_logs_status ON email_logs (status);
    `);
    
    console.log('email_logs table created successfully');
  } catch (error) {
    console.error('Error creating email_logs table:', error);
    throw error;
  }
}

// Run the function
createEmailLogsTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });