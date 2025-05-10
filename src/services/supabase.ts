import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { dealerCredentials } from '../shared/schema.js';

// Load environment variables
dotenv.config();

// Define the database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a postgres client with the connection string
const client = postgres(connectionString);
const db = drizzle(client);

/**
 * Retrieves an API key from the Supabase database
 * @param keyName - The name of the API key to retrieve
 * @returns The API key value or null if not found
 */
export async function getApiKey(keyName: string): Promise<string | null> {
  try {
    // Query the api_keys table for the specified key
    const result = await db.execute<{ key_value: string }>(
      sql`SELECT key_value FROM api_keys WHERE key_name = ${keyName} LIMIT 1`
    );
    
    if (result.length > 0) {
      return result[0].key_value;
    }
    
    console.error(`API key "${keyName}" not found in database`);
    return null;
  } catch (error) {
    console.error('Error retrieving API key from Supabase:', error);
    return null;
  }
}

/**
 * Retrieves dealer credentials from the Supabase database
 * @param dealerId - The unique identifier for the dealer
 * @returns The dealer credentials or null if not found
 */
export async function getDealerCredentials(dealerId: string): Promise<{username: string, password: string, apiEndpoint?: string} | null> {
  try {
    // Query the dealer_credentials table for the specified dealer
    const result = await db.execute<{ username: string, password: string, api_endpoint: string }>(
      sql`SELECT username, password, api_endpoint FROM dealer_credentials WHERE dealer_id = ${dealerId} LIMIT 1`
    );
    
    if (result.length > 0) {
      // Update the last used timestamp
      await db.update(dealerCredentials)
        .set({ lastUsed: new Date().toISOString() })
        .where(sql`dealer_id = ${dealerId}`);
        
      return {
        username: result[0].username,
        password: result[0].password,
        apiEndpoint: result[0].api_endpoint
      };
    }
    
    console.error(`Dealer credentials for "${dealerId}" not found in database`);
    return null;
  } catch (error) {
    console.error('Error retrieving dealer credentials from Supabase:', error);
    return null;
  }
}

/**
 * Saves dealer credentials to the Supabase database
 * @param dealerId - The unique identifier for the dealer
 * @param credentials - The credentials to save
 * @returns Boolean indicating success or failure
 */
export async function saveDealerCredentials(
  dealerId: string, 
  credentials: {username: string, password: string, apiEndpoint?: string}
): Promise<boolean> {
  try {
    // Check if credentials already exist
    const existing = await db.execute(
      sql`SELECT dealer_id FROM dealer_credentials WHERE dealer_id = ${dealerId} LIMIT 1`
    );
    
    if (existing.length > 0) {
      // Update existing credentials
      await db.update(dealerCredentials)
        .set({ 
          username: credentials.username,
          password: credentials.password,
          apiEndpoint: credentials.apiEndpoint,
          lastUsed: new Date().toISOString()
        })
        .where(sql`dealer_id = ${dealerId}`);
    } else {
      // Insert new credentials
      await db.insert(dealerCredentials).values({
        dealerId,
        username: credentials.username,
        password: credentials.password,
        apiEndpoint: credentials.apiEndpoint,
        lastUsed: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving dealer credentials to Supabase:', error);
    return false;
  }
}
