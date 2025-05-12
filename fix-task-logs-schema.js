/**
 * Database Migration Script: Add user_id Column to task_logs Table
 * 
 * This script adds the user_id column to the task_logs table if it doesn't exist.
 * It directly uses pg to run the SQL command for better compatibility.
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Create a PostgreSQL client with the connection string from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addUserIdColumnToTaskLogs() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database. Checking task_logs table...');
    
    // First check if the column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'task_logs' AND column_name = 'user_id';
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('The user_id column does not exist in task_logs table. Adding it now...');
      
      // Add the column if it doesn't exist
      await client.query(`
        ALTER TABLE task_logs ADD COLUMN user_id TEXT;
      `);
      
      console.log('✅ Successfully added user_id column to task_logs table');
    } else {
      console.log('The user_id column already exists in task_logs table');
    }
  } catch (error) {
    console.error('Error executing migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
try {
  await addUserIdColumnToTaskLogs();
  console.log('Migration completed successfully');
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}