/**
 * Fix task_logs Table Schema (CommonJS version)
 * Adds user_id column to task_logs table if it doesn't exist
 */

require('dotenv').config();
const { Client } = require('pg');

// Connection with SSL disabled for local development
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixTaskLogsSchema() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');

    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'task_logs' AND column_name = 'user_id';
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length === 0) {
      console.log('Adding user_id column to task_logs table...');
      
      // Add the column
      const alterQuery = `
        ALTER TABLE task_logs ADD COLUMN user_id TEXT;
      `;
      
      await client.query(alterQuery);
      console.log('✅ Successfully added user_id column to task_logs table');
    } else {
      console.log('user_id column already exists in task_logs table');
    }
  } catch (error) {
    console.error('Error fixing task_logs schema:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the migration
fixTaskLogsSchema();