// Script to create the security_audit_logs table
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
dotenv.config();

async function createSecurityAuditLogsTable() {
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
      WHERE table_schema = 'public' AND table_name = 'security_audit_logs'
    `);

    // If the table already exists, skip creation
    if (checkResult.rows.length > 0) {
      console.log('security_audit_logs table already exists, skipping creation');
      return true;
    }

    // Create the security_audit_logs table
    console.log('Creating security_audit_logs table...');
    await client.query(`
      CREATE TABLE security_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        user_agent TEXT,
        severity VARCHAR(20) NOT NULL DEFAULT 'info',
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX idx_security_audit_logs_user_id ON security_audit_logs(user_id);
      CREATE INDEX idx_security_audit_logs_event_type ON security_audit_logs(event_type);
      CREATE INDEX idx_security_audit_logs_severity ON security_audit_logs(severity);
      CREATE INDEX idx_security_audit_logs_timestamp ON security_audit_logs(timestamp);
    `);

    console.log('security_audit_logs table created successfully');
    return true;
  } catch (error) {
    console.error(`Error creating security_audit_logs table: ${error.message}`);
    return false;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the creation
createSecurityAuditLogsTable()
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
