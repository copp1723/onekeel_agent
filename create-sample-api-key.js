// Script to create a sample API key
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

const { Client } = pg;
dotenv.config();

// Generate a random API key
function generateApiKey() {
  return `ak_${crypto.randomBytes(24).toString('hex')}`;
}

async function createSampleApiKey() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');

    // Generate a random API key
    const keyValue = generateApiKey();
    const keyName = 'openai';
    const service = 'ai_service';
    const role = 'admin';
    const permissions = {
      'api_keys': ['create', 'read', 'update', 'delete', 'list'],
      'users': ['create', 'read', 'update', 'delete', 'list'],
      'reports': ['create', 'read', 'update', 'delete', 'list'],
      'insights': ['create', 'read', 'update', 'delete', 'list'],
      'workflows': ['create', 'read', 'update', 'delete', 'list', 'execute'],
      'system': ['read', 'update'],
    };

    // Create a sample API key
    console.log('Creating sample API key...');
    const result = await client.query(`
      INSERT INTO api_keys (
        key_name, 
        key_value, 
        service, 
        label, 
        role, 
        permissions, 
        key_version, 
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING id, key_name, service, role
    `, [
      keyName,
      keyValue,
      service,
      'OpenAI API Key',
      role,
      JSON.stringify(permissions),
      'v1',
      JSON.stringify({ created_by: 'setup_script' })
    ]);

    console.log('Sample API key created:');
    console.log(`- ID: ${result.rows[0].id}`);
    console.log(`- Key Name: ${result.rows[0].key_name}`);
    console.log(`- Service: ${result.rows[0].service}`);
    console.log(`- Role: ${result.rows[0].role}`);
    console.log(`- Key Value: ${keyValue}`);

    // Log the event to security_audit_logs
    console.log('Logging security event...');
    await client.query(`
      INSERT INTO security_audit_logs (
        event_type,
        event_data,
        severity
      ) VALUES (
        $1, $2, $3
      )
    `, [
      'api_key_created',
      JSON.stringify({
        key_name: keyName,
        service: service,
        role: role,
        created_by: 'setup_script'
      }),
      'info'
    ]);

    console.log('Security event logged');
    return true;
  } catch (error) {
    console.error(`Error creating sample API key: ${error.message}`);
    return false;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the creation
createSampleApiKey()
  .then(success => {
    if (success) {
      console.log('Sample API key creation completed successfully');
      process.exit(0);
    } else {
      console.error('Sample API key creation failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
