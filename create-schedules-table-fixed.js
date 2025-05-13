/**
 * Create Schedules Table (Fixed Version)
 * Uses JavaScript instead of TypeScript to create the schedules table
 */

import { db } from './src/shared/db.js';
import pg from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Create schedules table if it doesn't exist
 */
async function createSchedulesTable() {
  try {
    console.log('Setting up schedules table...');
    
    // Check if the table exists
    const tableExists = await checkTableExists('schedules');
    
    if (tableExists) {
      console.log('Schedules table already exists');
      
      // Check if userId/cronExpression columns exist and add them if needed
      await addMissingColumns();
    } else {
      // Create the table from scratch
      console.log('Creating schedules table...');
      
      const sql = `
        CREATE TABLE IF NOT EXISTS schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255),
          workflow_id UUID,
          intent TEXT,
          platform VARCHAR(255),
          cron TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          next_run_at TIMESTAMP WITH TIME ZONE,
          last_run_at TIMESTAMP WITH TIME ZONE,
          last_error TEXT,
          retry_count INTEGER DEFAULT 0,
          enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
        CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
        CREATE INDEX IF NOT EXISTS idx_schedules_next_run_at ON schedules(next_run_at);
      `;
      
      // Use a direct connection for DDL
      const sql_client = pg(process.env.DATABASE_URL);
      await sql_client.unsafe(sql);
      await sql_client.end();
      
      console.log('Schedules table created successfully');
    }
    
    // Return the count of schedules
    const [result] = await db.execute`
      SELECT COUNT(*) FROM schedules
    `;
    
    console.log(`Schedules table is ready with ${result?.count || 0} records`);
    
    return true;
  } catch (error) {
    console.error('Error setting up schedules table:', error);
    throw error;
  }
}

/**
 * Check if a table exists in the database
 */
async function checkTableExists(tableName) {
  try {
    // Use a direct connection for schema querying
    const sql_client = pg(process.env.DATABASE_URL);
    
    const result = await sql_client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      )
    `;
    
    await sql_client.end();
    
    return result[0]?.exists || false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Add missing columns to the schedules table if needed
 */
async function addMissingColumns() {
  try {
    const sql_client = pg(process.env.DATABASE_URL);
    
    // Check if user_id column exists
    const userIdColumnExists = await checkColumnExists('schedules', 'user_id');
    
    if (!userIdColumnExists) {
      console.log('Adding user_id column to schedules table...');
      await sql_client.unsafe(`
        ALTER TABLE schedules
        ADD COLUMN user_id VARCHAR(255)
      `);
      console.log('user_id column added');
    }
    
    // Check if cron column exists
    const cronColumnExists = await checkColumnExists('schedules', 'cron');
    
    if (!cronColumnExists) {
      console.log('Adding cron column to schedules table...');
      await sql_client.unsafe(`
        ALTER TABLE schedules
        ADD COLUMN cron TEXT NOT NULL DEFAULT '* * * * *'
      `);
      console.log('cron column added');
    }
    
    // Check if status column exists
    const statusColumnExists = await checkColumnExists('schedules', 'status');
    
    if (!statusColumnExists) {
      console.log('Adding status column to schedules table...');
      await sql_client.unsafe(`
        ALTER TABLE schedules
        ADD COLUMN status VARCHAR(50) DEFAULT 'active'
      `);
      console.log('status column added');
    }
    
    // Check if retry_count column exists
    const retryCountColumnExists = await checkColumnExists('schedules', 'retry_count');
    
    if (!retryCountColumnExists) {
      console.log('Adding retry_count column to schedules table...');
      await sql_client.unsafe(`
        ALTER TABLE schedules
        ADD COLUMN retry_count INTEGER DEFAULT 0
      `);
      console.log('retry_count column added');
    }
    
    // Check if last_error column exists
    const lastErrorColumnExists = await checkColumnExists('schedules', 'last_error');
    
    if (!lastErrorColumnExists) {
      console.log('Adding last_error column to schedules table...');
      await sql_client.unsafe(`
        ALTER TABLE schedules
        ADD COLUMN last_error TEXT
      `);
      console.log('last_error column added');
    }
    
    await sql_client.end();
  } catch (error) {
    console.error('Error adding missing columns:', error);
    throw error;
  }
}

/**
 * Check if a column exists in a table
 */
async function checkColumnExists(tableName, columnName) {
  try {
    const sql_client = pg(process.env.DATABASE_URL);
    
    const result = await sql_client`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
      )
    `;
    
    await sql_client.end();
    
    return result[0]?.exists || false;
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists in ${tableName}:`, error);
    return false;
  }
}

// Run the function
createSchedulesTable()
  .then(() => {
    console.log('Schedules table setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to set up schedules table:', error);
    process.exit(1);
  });