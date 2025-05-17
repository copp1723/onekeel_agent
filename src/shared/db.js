/**
 * Enhanced Database connection module with pooling, retry, health checks, and metrics
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// --- Pool Metrics ---
let queryCount = 0;
let lastQueryTime = 0;
let lastError = null;

// --- Retry Logic ---
async function withRetry(fn, retries = 5, delay = 1000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise(res => setTimeout(res, delay * attempt));
    }
  }
}

// --- Connection String ---
let connectionString = process.env.DATABASE_URL;
if (process.env.PGHOST && process.env.PGPORT && process.env.PGUSER &&
    process.env.PGPASSWORD && process.env.PGDATABASE) {
  connectionString = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  console.log('Using Replit PostgreSQL environment variables for database connection');
} else if (!connectionString) {
  throw new Error('No database connection information available');
}

// --- Create Pool with Timeouts and Metrics ---
console.log(`Connecting to database: ${connectionString.replace(/:[^:]+@/, ':***@')}`);
const client = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  idle_timeout: 30_000,
  max_lifetime: 60 * 60_000,
  connect_timeout: 30_000,
  max: 10, // pool size
  connection: {
    application_name: 'ai-agent-backend'
  },
  onnotice: (notice) => console.warn('DB Notice:', notice),
  onparameter: (key, value) => {},
  debug: false
});

// --- Drizzle DB instance ---
export const db = drizzle(client);

// --- Health Check ---
export async function dbHealthCheck() {
  try {
    const start = Date.now();
    await withRetry(() => client`SELECT 1`);
    lastQueryTime = Date.now() - start;
    return { healthy: true, lastQueryTime };
  } catch (err) {
    lastError = err;
    return { healthy: false, error: err.message };
  }
}

// --- Metrics ---
export function getDbMetrics() {
  return {
    queryCount,
    lastQueryTime,
    lastError: lastError ? lastError.message : null
  };
}

// --- Query Wrapper for Metrics ---
export async function dbQuery(...args) {
  const start = Date.now();
  try {
    queryCount++;
    const result = await client(...args);
    lastQueryTime = Date.now() - start;
    return result;
  } catch (err) {
    lastError = err;
    throw err;
  }
}

// --- Graceful Shutdown ---
export async function closeDbPool() {
  try {
    await client.end({ timeout: 5000 });
    console.log('Database pool closed');
  } catch (err) {
    console.error('Error closing database pool:', err);
  }
}

// --- Handle process shutdown ---
process.on('SIGINT', async () => {
  await closeDbPool();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await closeDbPool();
  process.exit(0);
});