import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the database connection
let connectionString = process.env.DATABASE_URL;

// If we have individual Replit PostgreSQL environment variables, use those instead
if (process.env.PGHOST && process.env.PGPORT && process.env.PGUSER && 
    process.env.PGPASSWORD && process.env.PGDATABASE) {
  connectionString = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  console.log('Using Replit PostgreSQL environment variables for database connection');
} else if (!connectionString) {
  throw new Error('No database connection information available');
}

// Create a postgres client with the connection string
console.log(`Connecting to database: ${connectionString.replace(/:[^:]+@/, ':***@')}`);
// Add SSL configuration, timeout settings, and other connection options for stability
const client = postgres(connectionString, {
  ssl: { rejectUnauthorized: false }, // Allow self-signed certificates
  timeout: 30_000,                    // 30s connect timeout
  idle_timeout: 30_000,               // 30s idle timeout
  max_lifetime: 60 * 60_000,          // 60 min connection lifetime
  connection: {
    application_name: 'ai-agent-backend' // Application identifier
  }
});

// Export the Drizzle DB instance
export const db = drizzle(client);