/**
 * Create Health Monitoring Tables Script
 * This script creates the health_checks and health_logs tables in the database
 */

import { db } from './dist/shared/db.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Create health monitoring tables if they don't exist
 */
async function createHealthTables() {
  try {
    console.log('Checking for existing health monitoring tables...');
    
    // Check if the tables already exist
    const tablesExist = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'health_checks'
      ) AS health_checks_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'health_logs'
      ) AS health_logs_exists;
    `);
    
    const { health_checks_exists, health_logs_exists } = tablesExist.rows[0];
    
    if (health_checks_exists && health_logs_exists) {
      console.log('Health monitoring tables already exist, skipping creation.');
      return;
    }
    
    console.log('Creating health monitoring tables...');
    
    // Create the health_checks table
    if (!health_checks_exists) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS health_checks (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          status VARCHAR(20) NOT NULL,
          response_time INTEGER NOT NULL,
          last_checked TIMESTAMP NOT NULL,
          message TEXT,
          details TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
        CREATE INDEX IF NOT EXISTS idx_health_checks_last_checked ON health_checks(last_checked);
      `);
      console.log('Created health_checks table');
    }
    
    // Create the health_logs table
    if (!health_logs_exists) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS health_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          check_id VARCHAR(50) NOT NULL REFERENCES health_checks(id),
          timestamp TIMESTAMP NOT NULL,
          status VARCHAR(20) NOT NULL,
          response_time INTEGER NOT NULL,
          message TEXT,
          details TEXT,
          CONSTRAINT fk_health_logs_check FOREIGN KEY (check_id) REFERENCES health_checks(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_health_logs_check_id ON health_logs(check_id);
        CREATE INDEX IF NOT EXISTS idx_health_logs_timestamp ON health_logs(timestamp);
      `);
      console.log('Created health_logs table');
    }
    
    console.log('Health monitoring tables created successfully');
    
  } catch (error) {
    console.error('Error creating health monitoring tables:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (process.argv[1].endsWith('create-health-tables.js')) {
  createHealthTables()
    .then(() => {
      console.log('Completed health tables setup');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to set up health tables:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
export { createHealthTables };