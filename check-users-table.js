// Script to check the users table structure
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
dotenv.config();

async function checkUsersTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');

    // Get the structure of the users table
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Structure of the users table:');
    if (result.rows.length === 0) {
      console.log('No columns found or table does not exist');
    } else {
      result.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
      });
    }

    // Check primary key
    const pkResult = await client.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'users'::regclass AND i.indisprimary;
    `);

    console.log('\nPrimary key of the users table:');
    if (pkResult.rows.length === 0) {
      console.log('No primary key found');
    } else {
      pkResult.rows.forEach(row => {
        console.log(`- ${row.attname}`);
      });
    }

    return true;
  } catch (error) {
    console.error(`Error checking users table: ${error.message}`);
    return false;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the check
checkUsersTable()
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
