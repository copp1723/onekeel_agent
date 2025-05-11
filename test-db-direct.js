// test-db-direct.js
import postgres from 'postgres';

console.log("Testing direct database connection...");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? 'Available (hidden)' : 'Not available');

// Use the newer connection parameters
const sql = postgres(process.env.DATABASE_URL, { 
  ssl: { rejectUnauthorized: false },
  idle_timeout: 30,
  connect_timeout: 30,
  max_lifetime: 60 * 5, // 5 minutes
  debug: true  // Verbose debugging
});

console.log("Database connection created, attempting query...");

sql`SELECT 1 as result`
  .then(result => {
    console.log('✅ DB connection successful:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ DB connection failed:', error);
    process.exit(1);
  });