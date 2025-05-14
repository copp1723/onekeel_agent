import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { apiKeys } from '../shared/schema.js.js';
import crypto from 'crypto';
import { sql } from 'drizzle-orm';
// Load environment variables
dotenv.config();
// Get the API key from command line arguments
const firecrawlApiKey = process.argv[2];
if (!firecrawlApiKey) {
  console.error('Please provide a Firecrawl API key as an argument');
  console.error('Usage: node dist/scripts/insert-firecrawl-key.js YOUR_API_KEY');
  process.exit(1);
}
// Define your database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}
async function insertApiKey() {
  console.log('Connecting to database...');
  // Create a postgres client
  const client = postgres(connectionString!);
  const db = drizzle(client);
  try {
    // Check if the key already exists
    const existingKeys = await db.select().from(apiKeys).where(sql`key_name = 'firecrawl'`);
    if (existingKeys.length > 0) {
      // Update the existing key
      console.log('Updating existing Firecrawl API key...');
      await // @ts-ignore
db.update(apiKeys)
        .set({ keyValue: firecrawlApiKey })
        .where(sql`key_name = 'firecrawl'`);
    } else {
      // Insert a new key
      console.log('Inserting new Firecrawl API key...');
      await // @ts-ignore
db.insert(apiKeys).values({
        id: crypto.randomUUID(),
        keyName: 'firecrawl',
        keyValue: firecrawlApiKey
      } as any) // @ts-ignore - Ensuring all required properties are provided;
    }
    console.log('Firecrawl API key has been saved to the database');
  } catch (error) {
    console.error('Error saving API key to database:', error);
  } finally {
    // Close the database connection
    await client.end();
  }
}
insertApiKey();