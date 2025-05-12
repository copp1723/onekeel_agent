/**
 * Migration runner script
 * Runs all pending database migrations
 * 
 * Usage: node apply-migrations.js
 */

import { applyMigrations } from './src/migrations/applyMigrations.js';

// Apply migrations
console.log('Starting database migrations...');

applyMigrations()
  .then(() => {
    console.log('Migrations completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });