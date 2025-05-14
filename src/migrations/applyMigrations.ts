/**
 * Database migration script
 * Applies all SQL migrations in sequence
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../shared/db.js.js';
// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Create migrations table if it doesn't exist
async function setupMigrationsTable() {
  try {
    // Check if migrations table exists
    const result = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      ) as "exists";
    `);
    // Parse result to check if migrations table exists
    // Cast as any to handle different types from drizzle
    const exists = (result as any)[0]?.exists === true;
    if (!exists) {
      // Create migrations table
      await db.execute(`
        CREATE TABLE migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created migrations table');
    }
  } catch (error) {
    console.error('Error setting up migrations table:', error);
    throw error;
  }
}
// Check if migration has been applied
async function isMigrationApplied(name: string): Promise<boolean> {
  try {
    const result = await db.execute(`
      SELECT COUNT(*) as count FROM migrations WHERE name = '${name}'
    `);
    // Parse the result using a more generic approach to handle different Drizzle return types
    const countValue = (result as any)[0]?.count;
    return countValue ? parseInt(countValue.toString(), 10) > 0 : false;
  } catch (error) {
    console.error(`Error checking migration status for ${name}:`, error);
    return false;
  }
}
// Record that migration has been applied
async function recordMigration(name: string): Promise<void> {
  try {
    await db.execute(`
      INSERT INTO migrations (name) VALUES ('${name}')
    `);
    console.log(`Recorded migration: ${name}`);
  } catch (error) {
    console.error(`Error recording migration ${name}:`, error);
    throw error;
  }
}
// Apply a single migration
async function applyMigration(filePath: string, fileName: string): Promise<void> {
  try {
    // Read SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    // Execute SQL
    await db.execute(sql);
    // Record successful migration
    await recordMigration(fileName);
    console.log(`Applied migration: ${fileName}`);
  } catch (error) {
    console.error(`Error applying migration ${fileName}:`, error);
    throw error;
  }
}
// Main function to apply all pending migrations
export async function applyMigrations(): Promise<void> {
  try {
    await setupMigrationsTable();
    // Get all SQL files in migrations directory
    const files = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Apply in alphabetical order
    console.log(`Found ${files.length} migration files`);
    // Apply each migration if not already applied
    for (const file of files) {
      if (await isMigrationApplied(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }
      const filePath = path.join(__dirname, file);
      await applyMigration(filePath, file);
    }
    console.log('All migrations applied successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}
// Run migrations if script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  applyMigrations()
    .then(() => {
      console.log('Migrations completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}