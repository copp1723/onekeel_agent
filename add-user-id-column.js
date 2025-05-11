import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// Define database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, { 
  max: 1,  // Use minimal connections
  idle_timeout: 5, // Short timeout
  connect_timeout: 10 // Short connect timeout
});
const db = drizzle(client);

async function addUserIdColumn() {
  console.log('Starting user_id column migration...');
  
  try {
    console.log('Checking if user_id column exists in task_logs...');
    
    // Check if column exists
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'task_logs' AND column_name = 'user_id'
    `);
    
    if (columns.length > 0) {
      console.log('user_id column already exists in task_logs table');
    } else {
      console.log('Adding user_id column to task_logs table...');
      
      // Add the column
      await db.execute(sql`
        ALTER TABLE task_logs 
        ADD COLUMN user_id VARCHAR
      `);
      
      console.log('Successfully added user_id column to task_logs table');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close the connection
    await client.end();
    console.log('Migration complete');
  }
}

// Run the migration
addUserIdColumn();