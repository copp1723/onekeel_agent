/**
 * Add user_id column to task_logs table if it doesn't exist.
 * This migration handles the case where task_logs schema needs updating.
 */

import dotenv from 'dotenv';
import pg from 'pg';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addUserIdToTaskLogs() {
  const client = await pool.connect();
  try {
    console.log('Checking if user_id column exists in task_logs table...');
    
    // Check if the column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'task_logs' AND column_name = 'user_id';
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('user_id column does not exist. Adding it...');
      
      // Add the column
      await client.query(`
        ALTER TABLE task_logs 
        ADD COLUMN user_id TEXT;
      `);
      
      console.log('Successfully added user_id column to task_logs table');
    } else {
      console.log('user_id column already exists in task_logs table');
    }
  } catch (error) {
    console.error('Error adding user_id column:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addUserIdToTaskLogs().catch(console.error);