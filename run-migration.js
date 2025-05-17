// Simple script to run the API key security fields migration
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
dotenv.config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');

    console.log('Starting migration: Add API Key Security Fields');

    // Check if the columns already exist
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'api_keys' AND column_name = 'key_version'
    `);

    // If the column already exists, skip the migration
    if (checkResult.rows.length > 0) {
      console.log('Migration already applied, skipping');
      return true;
    }

    // Add new columns to the api_keys table
    console.log('Adding new columns to api_keys table...');
    await client.query(`
      ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS auth_tag TEXT,
      ADD COLUMN IF NOT EXISTS key_version VARCHAR(20) DEFAULT 'v1',
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rotation_status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS previous_key_id UUID REFERENCES api_keys(id)
    `);

    // Create indexes for the new columns
    console.log('Creating indexes for new columns...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_role ON api_keys(role);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_version ON api_keys(key_version);
      CREATE INDEX IF NOT EXISTS idx_api_keys_rotation_status ON api_keys(rotation_status);
    `);

    console.log('Migration completed successfully: Add API Key Security Fields');
    return true;
  } catch (error) {
    console.error(`Migration failed: ${error.message}`);
    return false;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the migration
runMigration()
  .then(success => {
    if (success) {
      console.log('Migration completed successfully');
      process.exit(0);
    } else {
      console.error('Migration failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
