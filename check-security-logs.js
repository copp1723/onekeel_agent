// Script to check security audit logs
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
dotenv.config();

async function checkSecurityLogs() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');

    // Get security audit logs
    const result = await client.query(`
      SELECT id, event_type, event_data, severity, timestamp
      FROM security_audit_logs
      ORDER BY timestamp DESC
      LIMIT 10;
    `);

    console.log('Recent security audit logs:');
    if (result.rows.length === 0) {
      console.log('No logs found');
    } else {
      result.rows.forEach(row => {
        console.log(`- ID: ${row.id}`);
        console.log(`  Event Type: ${row.event_type}`);
        console.log(`  Event Data: ${JSON.stringify(row.event_data)}`);
        console.log(`  Severity: ${row.severity}`);
        console.log(`  Timestamp: ${row.timestamp}`);
        console.log('---');
      });
    }

    return true;
  } catch (error) {
    console.error(`Error checking security logs: ${error.message}`);
    return false;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the check
checkSecurityLogs()
  .then(success => {
    if (success) {
      console.log('Check completed successfully');
      process.exit(0);
    } else {
      console.error('Check failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
