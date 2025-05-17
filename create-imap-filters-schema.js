/**
 * Create IMAP filters schema
 * 
 * This script creates the imap_filters table schema in the TypeScript code.
 */

import * as fs from 'fs';
import * as path from 'path';

// Define the schema addition
const schemaAddition = `
// IMAP filters for email ingestion
export const imapFilters = pgTable(
  'imap_filters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platform: varchar('platform', { length: 50 }).notNull().unique(),
    fromAddress: text('from_address'),
    subjectRegex: text('subject_regex'),
    daysBack: integer('days_back').default(7).notNull(),
    filePattern: text('file_pattern'),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_imap_filters_platform').on(table.platform),
    index('idx_imap_filters_active').on(table.active),
  ]
);

export type UpsertImapFilter = typeof imapFilters.$inferInsert;
export type ImapFilter = typeof imapFilters.$inferSelect;
`;

// Define the schema file path
const schemaFilePath = path.join(process.cwd(), 'src', 'shared', 'schema.ts');

// Read the current schema file
fs.readFile(schemaFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading schema file:', err);
    process.exit(1);
  }

  // Check if the schema already contains the imapFilters table
  if (data.includes('imapFilters')) {
    console.log('imap_filters table already exists in the schema');
    process.exit(0);
  }

  // Find the position to insert the new schema
  const insertPosition = data.indexOf('// Workflow step interfaces');
  
  if (insertPosition === -1) {
    console.error('Could not find insertion point in schema file');
    process.exit(1);
  }

  // Insert the schema addition
  const newSchema = data.slice(0, insertPosition) + schemaAddition + '\n' + data.slice(insertPosition);

  // Write the updated schema back to the file
  fs.writeFile(schemaFilePath, newSchema, 'utf8', (err) => {
    if (err) {
      console.error('Error writing schema file:', err);
      process.exit(1);
    }

    console.log('Successfully added imap_filters table to schema');
    process.exit(0);
  });
});
