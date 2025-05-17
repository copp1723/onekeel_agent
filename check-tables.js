// Script to check database tables
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
dotenv.config();

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');

    // Get all tables in the public schema
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Tables in the database:');
    if (result.rows.length === 0) {
      console.log('No tables found');
    } else {
      result.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }

    return true;
  } catch (error) {
    console.error(`Error checking tables: ${error.message}`);
    return false;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the check
checkTables()
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
