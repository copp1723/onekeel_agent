// Simple script to create the required database tables

import { db } from './dist/shared/db.js';
import { 
  apiKeys, 
  dealerCredentials, 
  taskLogs, 
  plans, 
  steps 
} from './dist/shared/schema.js';
import { sql } from 'drizzle-orm';

async function setupDatabase() {
  console.log('Setting up database tables...');
  
  try {
    // Create tables if they don't exist
    console.log('Creating api_keys table');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        key_name VARCHAR(255) UNIQUE NOT NULL,
        key_value TEXT NOT NULL
      );
    `);
    
    console.log('Creating dealer_credentials table');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dealer_credentials (
        dealer_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        api_endpoint TEXT,
        last_used TEXT
      );
    `);
    
    console.log('Creating task_logs table');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS task_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_input TEXT NOT NULL,
        tool TEXT NOT NULL,
        status TEXT NOT NULL,
        output JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Creating plans table');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Creating steps table');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL REFERENCES plans(id),
        step_index INTEGER NOT NULL,
        tool TEXT NOT NULL,
        input JSON NOT NULL,
        output JSON,
        status TEXT DEFAULT 'pending',
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

setupDatabase();