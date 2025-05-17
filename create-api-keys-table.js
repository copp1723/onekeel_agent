// Script to create the api_keys table
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
dotenv.config();

async function createApiKeysTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');

    // Check if the table already exists
    const checkResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'api_keys'
    `);

    // If the table already exists, skip creation
    if (checkResult.rows.length > 0) {
      console.log('api_keys table already exists, skipping creation');
      return true;
    }

    // Create the api_keys table with all the security fields
    console.log('Creating api_keys table...');
    await client.query(`
      CREATE TABLE api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        key_name VARCHAR(100) NOT NULL,
        key_value TEXT NOT NULL,
        service VARCHAR(100) NOT NULL,
        label VARCHAR(100),
        encrypted_data TEXT,
        iv TEXT,
        auth_tag TEXT,
        key_version VARCHAR(20) DEFAULT 'v1',
        metadata JSONB DEFAULT '{}',
        permissions JSONB DEFAULT '{}',
        role VARCHAR(50) DEFAULT 'user',
        expires_at TIMESTAMP,
        rotated_at TIMESTAMP,
        rotation_status VARCHAR(20) DEFAULT 'active',
        previous_key_id UUID,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX idx_api_keys_key_name ON api_keys(key_name);
      CREATE INDEX idx_api_keys_user_service ON api_keys(user_id, service);
      CREATE INDEX idx_api_keys_role ON api_keys(role);
      CREATE INDEX idx_api_keys_key_version ON api_keys(key_version);
      CREATE INDEX idx_api_keys_rotation_status ON api_keys(rotation_status);
      CREATE UNIQUE INDEX idx_api_keys_key_name_service ON api_keys(key_name, service);
    `);

    console.log('api_keys table created successfully');
    return true;
  } catch (error) {
    console.error(`Error creating api_keys table: ${error.message}`);
    return false;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the creation
createApiKeysTable()
  .then(success => {
    if (success) {
      console.log('Table creation completed successfully');
      process.exit(0);
    } else {
      console.error('Table creation failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
