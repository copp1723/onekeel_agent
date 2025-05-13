/**
 * Fix Scheduler Table Script
 * Adds the missing user_id column to the schedules table
 */

import pg from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixSchedulerTable() {
  try {
    console.log('Using Replit PostgreSQL environment variables for database connection');
    console.log(`Connecting to database: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
    
    // Connect to the database
    const sql = pg(process.env.DATABASE_URL);
    
    // Check if the schedules table exists
    const tableExists = await checkTableExists(sql, 'schedules');
    
    if (!tableExists) {
      console.log('Schedules table does not exist. Creating it...');
      await createSchedulesTable(sql);
    } else {
      console.log('Schedules table exists. Checking columns...');
      
      // Check if user_id column exists
      const userIdExists = await checkColumnExists(sql, 'schedules', 'user_id');
      
      if (!userIdExists) {
        console.log('Adding user_id column to schedules table...');
        await sql.unsafe(`
          ALTER TABLE schedules
          ADD COLUMN user_id VARCHAR(255)
        `);
        console.log('user_id column added successfully');
      } else {
        console.log('user_id column already exists');
      }
      
      // Check if last_error column exists
      const lastErrorExists = await checkColumnExists(sql, 'schedules', 'last_error');
      
      if (!lastErrorExists) {
        console.log('Adding last_error column to schedules table...');
        await sql.unsafe(`
          ALTER TABLE schedules
          ADD COLUMN last_error TEXT
        `);
        console.log('last_error column added successfully');
      } else {
        console.log('last_error column already exists');
      }
      
      // Create missing indexes
      await createMissingIndexes(sql);
    }
    
    // Count schedules
    const result = await sql`SELECT COUNT(*) FROM schedules`;
    console.log(`Schedules table has ${result[0].count} records`);
    
    console.log('Scheduler table fix completed successfully');
    
    // Close the connection
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error fixing scheduler table:', error);
    process.exit(1);
  }
}

async function checkTableExists(sql, tableName) {
  const result = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
    )
  `;
  
  return result[0]?.exists || false;
}

async function checkColumnExists(sql, tableName, columnName) {
  const result = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    )
  `;
  
  return result[0]?.exists || false;
}

async function createSchedulesTable(sql) {
  await sql.unsafe(`
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
  `);
  
  console.log('Schedules table created successfully');
}

async function createMissingIndexes(sql) {
  // Check if user_id index exists
  const userIdIndexExists = await checkIndexExists(sql, 'idx_schedules_user_id');
  
  if (!userIdIndexExists) {
    console.log('Creating index for user_id column...');
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id)
    `);
    console.log('user_id index created');
  }
  
  // Check if status index exists
  const statusIndexExists = await checkIndexExists(sql, 'idx_schedules_status');
  
  if (!statusIndexExists) {
    console.log('Creating index for status column...');
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status)
    `);
    console.log('status index created');
  }
  
  // Check if next_run_at index exists
  const nextRunAtIndexExists = await checkIndexExists(sql, 'idx_schedules_next_run_at');
  
  if (!nextRunAtIndexExists) {
    console.log('Creating index for next_run_at column...');
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_schedules_next_run_at ON schedules(next_run_at)
    `);
    console.log('next_run_at index created');
  }
}

async function checkIndexExists(sql, indexName) {
  const result = await sql`
    SELECT EXISTS (
      SELECT FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname = ${indexName}
    )
  `;
  
  return result[0]?.exists || false;
}

// Run the fix
fixSchedulerTable();