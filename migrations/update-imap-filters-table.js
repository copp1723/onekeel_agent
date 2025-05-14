/**
 * Migration to update the imap_filters table
 * 
 * This migration:
 * 1. Renames the 'platform' column to 'vendor'
 * 2. Changes the 'id' column from UUID to SERIAL
 * 3. Makes 'from_address' and 'subject_regex' NOT NULL
 * 4. Adds a 'last_used' timestamp column
 * 5. Adds a unique constraint on vendor+from_address
 */

import { sql } from 'drizzle-orm';
import { db } from '../src/shared/db.js';
import { logger } from '../src/shared/logger.js';

async function migrate() {
  logger.info('Starting migration: update-imap-filters-table');

  try {
    // Check if the table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'imap_filters'
      );
    `);

    if (!tableExists.rows[0].exists) {
      logger.info('imap_filters table does not exist, creating it');
      
      // Create the table from scratch
      await db.execute(sql`
        CREATE TABLE imap_filters (
          id SERIAL PRIMARY KEY,
          vendor VARCHAR(100) NOT NULL,
          from_address VARCHAR(255) NOT NULL,
          subject_regex TEXT NOT NULL,
          days_back INTEGER NOT NULL DEFAULT 7,
          file_pattern TEXT,
          active BOOLEAN NOT NULL DEFAULT true,
          last_used TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );

        CREATE INDEX idx_imap_filters_vendor ON imap_filters(vendor);
        CREATE INDEX idx_imap_filters_active ON imap_filters(active);
        CREATE UNIQUE INDEX idx_imap_filters_vendor_from ON imap_filters(vendor, from_address);
      `);

      // Insert default filters
      await db.execute(sql`
        INSERT INTO imap_filters
          (vendor, from_address, subject_regex, days_back, file_pattern, active)
        VALUES
          ('VinSolutions', 'reports@vinsolutions.com', 'Report Export', 7, '\\.csv$', true),
          ('VAUTO', 'noreply@vauto.com', 'Your vAuto Report', 7, '\\.csv$', true);
      `);

      logger.info('Successfully created imap_filters table with default entries');
    } else {
      logger.info('imap_filters table exists, updating it');

      // Check if we need to rename the platform column to vendor
      const hasPlatformColumn = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'imap_filters' AND column_name = 'platform'
        );
      `);

      if (hasPlatformColumn.rows[0].exists) {
        logger.info('Renaming platform column to vendor');
        
        // Create a temporary table with the new schema
        await db.execute(sql`
          CREATE TABLE imap_filters_new (
            id SERIAL PRIMARY KEY,
            vendor VARCHAR(100) NOT NULL,
            from_address VARCHAR(255) NOT NULL,
            subject_regex TEXT NOT NULL,
            days_back INTEGER NOT NULL DEFAULT 7,
            file_pattern TEXT,
            active BOOLEAN NOT NULL DEFAULT true,
            last_used TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );
        `);

        // Copy data from old table to new table
        await db.execute(sql`
          INSERT INTO imap_filters_new (
            vendor, from_address, subject_regex, days_back, file_pattern, active, created_at, updated_at
          )
          SELECT 
            platform, 
            COALESCE(from_address, 'unknown@example.com'), 
            COALESCE(subject_regex, '.*'), 
            days_back, 
            file_pattern, 
            active, 
            created_at, 
            updated_at
          FROM imap_filters;
        `);

        // Drop the old table and rename the new one
        await db.execute(sql`
          DROP TABLE imap_filters;
          ALTER TABLE imap_filters_new RENAME TO imap_filters;
        `);

        // Create indexes
        await db.execute(sql`
          CREATE INDEX idx_imap_filters_vendor ON imap_filters(vendor);
          CREATE INDEX idx_imap_filters_active ON imap_filters(active);
          CREATE UNIQUE INDEX idx_imap_filters_vendor_from ON imap_filters(vendor, from_address);
        `);

        logger.info('Successfully updated imap_filters table schema');
      } else {
        // Check if we need to add the last_used column
        const hasLastUsedColumn = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'imap_filters' AND column_name = 'last_used'
          );
        `);

        if (!hasLastUsedColumn.rows[0].exists) {
          logger.info('Adding last_used column');
          await db.execute(sql`
            ALTER TABLE imap_filters ADD COLUMN last_used TIMESTAMP WITH TIME ZONE;
          `);
        }

        // Ensure from_address and subject_regex are NOT NULL
        await db.execute(sql`
          UPDATE imap_filters SET from_address = 'unknown@example.com' WHERE from_address IS NULL;
          UPDATE imap_filters SET subject_regex = '.*' WHERE subject_regex IS NULL;
          
          ALTER TABLE imap_filters 
            ALTER COLUMN from_address SET NOT NULL,
            ALTER COLUMN subject_regex SET NOT NULL;
        `);

        // Add unique constraint if it doesn't exist
        const hasUniqueConstraint = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM pg_indexes
            WHERE tablename = 'imap_filters' AND indexname = 'idx_imap_filters_vendor_from'
          );
        `);

        if (!hasUniqueConstraint.rows[0].exists) {
          logger.info('Adding unique constraint on vendor and from_address');
          await db.execute(sql`
            CREATE UNIQUE INDEX idx_imap_filters_vendor_from ON imap_filters(vendor, from_address);
          `);
        }

        logger.info('Successfully updated imap_filters table');
      }
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
