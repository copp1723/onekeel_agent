/**
 * Migration to create the failed_emails table
 * 
 * This table stores information about emails that failed processing,
 * allowing for retry mechanisms and error analysis.
 */

import { sql } from 'drizzle-orm';
import { db } from '../src/shared/db.js';
import { logger } from '../src/shared/logger.js';

async function migrate() {
  logger.info('Starting migration: create-failed-emails-table');

  try {
    // Check if the table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'failed_emails'
      );
    `);

    if (!tableExists.rows[0].exists) {
      logger.info('failed_emails table does not exist, creating it');
      
      // Create the table
      await db.execute(sql`
        CREATE TABLE failed_emails (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vendor VARCHAR(100) NOT NULL,
          message_id VARCHAR(255),
          subject TEXT,
          from_address VARCHAR(255),
          received_date TIMESTAMP WITH TIME ZONE,
          error_message TEXT NOT NULL,
          error_stack TEXT,
          retry_count INTEGER NOT NULL DEFAULT 0,
          max_retries INTEGER NOT NULL DEFAULT 3,
          next_retry_at TIMESTAMP WITH TIME ZONE,
          status VARCHAR(20) NOT NULL DEFAULT 'failed',
          raw_content TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );

        CREATE INDEX idx_failed_emails_vendor ON failed_emails(vendor);
        CREATE INDEX idx_failed_emails_status ON failed_emails(status);
        CREATE INDEX idx_failed_emails_next_retry ON failed_emails(next_retry_at);
      `);

      logger.info('Successfully created failed_emails table');
    } else {
      logger.info('failed_emails table already exists, skipping creation');
    }

    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrate()
  .then(() => {
    logger.info('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });
