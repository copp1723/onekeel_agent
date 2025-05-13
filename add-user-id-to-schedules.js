/**
 * Add User ID Column to Schedules Table
 * Uses direct SQL to add the column
 */

import pg from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to the database
const sql = pg(process.env.DATABASE_URL);

async function checkColumnExists() {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'schedules'
        AND column_name = 'user_id'
      )
    `;
    
    return result[0]?.exists || false;
  } catch (error) {
    console.error('Error checking if column exists:', error);
    return false;
  }
}

async function addUserIdColumn() {
  try {
    console.log('Using Replit PostgreSQL environment variables for database connection');
    console.log(`Connecting to database: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
    
    // Check if column already exists
    const exists = await checkColumnExists();
    
    if (exists) {
      console.log('user_id column already exists in schedules table');
    } else {
      console.log('Adding user_id column to schedules table...');
      
      // Add user_id column
      await sql.unsafe(`
        ALTER TABLE schedules
        ADD COLUMN user_id VARCHAR(255)
      `);
      
      console.log('user_id column added successfully');
    }
    
    // Also check if last_error column exists
    const lastErrorExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'schedules'
        AND column_name = 'last_error'
      )
    `;
    
    if (!lastErrorExists[0]?.exists) {
      console.log('Adding last_error column to schedules table...');
      
      await sql.unsafe(`
        ALTER TABLE schedules
        ADD COLUMN last_error TEXT
      `);
      
      console.log('last_error column added successfully');
    } else {
      console.log('last_error column already exists in schedules table');
    }
    
    console.log('Schema update completed');
  } catch (error) {
    console.error('Error adding user_id column:', error.message);
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the script
addUserIdColumn();