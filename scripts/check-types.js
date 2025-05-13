#!/usr/bin/env node

/**
 * Script to check TypeScript types
 *
 * This script runs the TypeScript compiler in noEmit mode to check for type errors.
 */
import { execSync } from 'child_process';
import path from 'path';

// Get the list of files to check from command line arguments
const files = process.argv.slice(2);

// If no files are specified, check all TypeScript files
const fileList = files.length > 0
  ? files.join(' ')
  : 'src/**/*.ts';

try {
  // Run the TypeScript compiler in noEmit mode
  console.log(`Checking types in ${fileList}...`);
  execSync(`npx tsc --noEmit ${fileList}`, { stdio: 'inherit' });
  console.log('Type check passed!');
  process.exit(0);
} catch (error) {
  console.error('Type check failed!');
  process.exit(1);
}
