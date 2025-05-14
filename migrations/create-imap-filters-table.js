/**
 * Migration to create the imap_filters table
 *
 * This table stores IMAP search criteria per vendor, allowing us to
 * parameterize email search without requiring code changes.
 */

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the database connection
let connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

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

// Create the Drizzle DB instance
const db = drizzle(client);

async function main() {
  console.log('Creating imap_filters table...');

  try {
    // Check if table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'imap_filters'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('imap_filters table already exists, skipping creation');
      return;
    }

    // Create the imap_filters table
    await db.execute(sql`
      CREATE TABLE imap_filters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50) NOT NULL UNIQUE,
        from_address TEXT,
        subject_regex TEXT,
        days_back INTEGER NOT NULL DEFAULT 7,
        file_pattern TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_imap_filters_platform ON imap_filters(platform);
      CREATE INDEX idx_imap_filters_active ON imap_filters(active);
    `);

    // Insert default filters for known platforms
    await db.execute(sql`
      INSERT INTO imap_filters
        (platform, from_address, subject_regex, days_back, file_pattern, active)
      VALUES
        ('VinSolutions', 'reports@vinsolutions.com', 'Report Export', 7, '\\.csv$', true),
        ('VAUTO', 'noreply@vauto.com', 'Your vAuto Report', 7, '\\.csv$', true);
    `);

    console.log('Successfully created imap_filters table with default entries');
  } catch (error) {
    console.error('Error creating imap_filters table:', error);
    throw error;
  }
}

// Run the migration
main()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
