/**
 * Run the IMAP filters migration
 * 
 * This script creates the imap_filters table in the database.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('Running IMAP filters migration...');
  
  try {
    const migrationPath = path.join(__dirname, 'migrations', 'create-imap-filters-table.js');
    const { stdout, stderr } = await execPromise(`node ${migrationPath}`);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
