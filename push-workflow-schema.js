/**
 * Push Workflow Schema to Database
 * This script creates the workflows table in the database
 */

import { db } from './dist/shared/db.js';
import { workflows } from './dist/shared/schema.js';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

async function pushWorkflowSchema() {
  try {
    console.log('Connecting to database...');
    
    // Get the connection string from environment variables
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('Creating workflows table...');
    
    // Create the table using schema definition without foreign key constraint
    const migrationResult = await db.execute(`
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR,
        steps JSONB NOT NULL,
        current_step INTEGER NOT NULL DEFAULT 0,
        context JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        last_error TEXT,
        last_updated TIMESTAMP,
        locked BOOLEAN DEFAULT FALSE,
        locked_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
      CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
    `);
    
    console.log('Workflow schema pushed successfully!');
    
    // Verify the table exists by counting records
    const [countResult] = await db.select({
      count: sql`COUNT(*)`,
    }).from(workflows);
    
    console.log(`Workflow table created with ${countResult.count} records`);
    
    return true;
  } catch (error) {
    console.error('Error pushing workflow schema:', error);
    throw error;
  } finally {
    console.log('Schema push operation complete');
  }
}

// Run the migration
pushWorkflowSchema().catch(error => {
  console.error('Schema push failed:', error);
  process.exit(1);
});