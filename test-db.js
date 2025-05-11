// Test script to verify direct database connection

import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;

// Load environment variables
dotenv.config();

// Log raw connection details (sanitized)
console.log("🔑 DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:]+@/, ':***@'));
console.log("PGHOST:", process.env.PGHOST);
console.log("PGPORT:", process.env.PGPORT);
console.log("PGUSER:", process.env.PGUSER);
console.log("PGDATABASE:", process.env.PGDATABASE);
console.log("PGPASSWORD:", process.env.PGPASSWORD ? "[REDACTED]" : "missing");

// Construct connection string from individual vars
const manualConnString = process.env.PGHOST 
  ? `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`
  : null;

console.log("Constructed conn string:", manualConnString?.replace(/:[^:]+@/, ':***@'));

// Try with DATABASE_URL first
console.log("\n--- Testing connection with DATABASE_URL ---");
const client1 = new Client({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Try with SSL first
});

client1.connect()
  .then(() => {
    console.log("✅ DB connected with DATABASE_URL!");
    return client1.query('SELECT current_database() as db_name');
  })
  .then(result => {
    console.log("Database name:", result.rows[0].db_name);
    return client1.end();
  })
  .catch(err => {
    console.error("❌ DB error with DATABASE_URL:", err);
    
    // If that fails, try with manual connection string
    console.log("\n--- Testing connection with manual connection string ---");
    if (!manualConnString) {
      console.error("No manual connection string available, missing PG* variables");
      return;
    }
    
    const client2 = new Client({ 
      connectionString: manualConnString,
      ssl: { rejectUnauthorized: false }
    });
    
    return client2.connect()
      .then(() => {
        console.log("✅ DB connected with manual connection string!");
        return client2.query('SELECT current_database() as db_name');
      })
      .then(result => {
        console.log("Database name:", result.rows[0].db_name);
        return client2.end();
      })
      .catch(err => {
        console.error("❌ DB error with manual connection string:", err);
      });
  });