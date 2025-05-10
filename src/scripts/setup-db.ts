import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { apiKeys, taskLogs, dealerCredentials } from '../shared/schema.js';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Define your database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

async function setupDatabase() {
  console.log('Setting up database...');
  
  // Create a postgres client
  const client = postgres(connectionString!);
  const db = drizzle(client);
  
  try {
    // Create the api_keys table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY NOT NULL,
        key_name VARCHAR(255) NOT NULL UNIQUE,
        key_value TEXT NOT NULL
      );
    `);
    
    // Create the dealer_credentials table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dealer_credentials (
        dealer_id TEXT PRIMARY KEY NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        api_endpoint TEXT,
        last_used TEXT
      );
    `);
    
    // Create the task_logs table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS task_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_input TEXT NOT NULL,
        tool TEXT NOT NULL,
        status TEXT NOT NULL,
        output JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Database tables set up successfully');
    
    // Check if we need to insert a default Firecrawl key
    // This is just to check if any key exists - insert your real key manually
    const existingKeys = await db.select().from(apiKeys).where(sql`key_name = 'firecrawl'`);
    
    if (existingKeys.length === 0) {
      console.log('Inserting placeholder for Firecrawl API key...');
      // Insert a placeholder - you'll need to update this with a real key later
      await db.insert(apiKeys).values({
        id: crypto.randomUUID(),
        keyName: 'firecrawl',
        keyValue: 'YOUR_FIRECRAWL_API_KEY', // Replace with actual Firecrawl API key
      });
      
      console.log('Please update the Firecrawl API key in the database with your actual key');
    } else {
      console.log('Firecrawl API key already exists in database');
    }
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database setup complete');
  }
}

setupDatabase();