/**
 * Create Schedules Table Script
 * This script creates the schedules table in the database
 */

import { db } from './dist/shared/db.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createSchedulesTable() {
  try {
    console.log('Connecting to database...');
    
    console.log('Creating schedules table...');
    
    // Create the schedules table with foreign key to workflows
    const migrationResult = await db.execute(`
      CREATE TABLE IF NOT EXISTS schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
        cron TEXT NOT NULL,
        last_run_at TIMESTAMP,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_schedules_workflow_id ON schedules(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
    `);
    
    console.log('Schedules table created successfully!');
    
    // Verify the table exists by counting records
    const [countResult] = await db.select({
      count: sql`COUNT(*)`,
    }).from(sql`schedules`);
    
    console.log(`Schedules table created with ${countResult.count} records`);
    
    return true;
  } catch (error) {
    console.error('Error creating schedules table:', error);
    throw error;
  } finally {
    console.log('Table creation operation complete');
  }
}

// Run the migration
createSchedulesTable().catch(error => {
  console.error('Table creation failed:', error);
  process.exit(1);
});