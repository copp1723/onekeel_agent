
import { db } from './src/shared/db.js';

async function createEmailQueueTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id TEXT PRIMARY KEY,
        options JSONB NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        error TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
      CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);
    `);

    console.log('Email queue table created successfully');
  } catch (error) {
    console.error('Error creating email queue table:', error);
  }
}

createEmailQueueTable();
