/**
 * Fix task_logs Table Schema (Direct SQL)
 * Uses direct SQL query to add user_id column to task_logs table if it doesn't exist
 */

import { Client } from 'pg';
import parse from 'pg-connection-string';
import { config } from 'dotenv';

config();

const main = async () => {
  try {
    // Get PGDATABASE from environment directly if possible
    const pgDatabase = process.env.PGDATABASE;
    const pgUser = process.env.PGUSER;
    const pgPassword = process.env.PGPASSWORD;
    const pgHost = process.env.PGHOST;
    const pgPort = process.env.PGPORT;

    console.log('Using Replit PostgreSQL environment variables for database connection');
    
    // Direct connection parameters
    const connectionConfig = {};
    
    if (pgHost) connectionConfig.host = pgHost;
    if (pgPort) connectionConfig.port = pgPort;
    if (pgDatabase) connectionConfig.database = pgDatabase;
    if (pgUser) connectionConfig.user = pgUser;
    if (pgPassword) connectionConfig.password = pgPassword;
    
    // SSL settings for remote database
    connectionConfig.ssl = {
      rejectUnauthorized: false
    };
    
    console.log('Connecting to database...');
    const client = new Client(connectionConfig);
    await client.connect();
    console.log('Connected to database successfully!');

    // First check if the table exists
    const tableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'task_logs'
      );
    `;

    const tableResult = await client.query(tableQuery);
    if (!tableResult.rows[0].exists) {
      console.log('task_logs table does not exist, nothing to modify');
      await client.end();
      return;
    }

    // Check if column exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'task_logs' AND column_name = 'user_id'
      );
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (!checkResult.rows[0].exists) {
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

    await client.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error fixing task_logs schema:', error);
    process.exit(1);
  }
};

main();