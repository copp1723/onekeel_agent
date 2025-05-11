/**
 * Entry point for running the fixed server implementation
 * Uses direct pattern matching and bypasses database issues
 */

// Build the TypeScript files first
import { execSync } from 'child_process';

try {
  console.log('Transpiling TypeScript files...');
  execSync('npx tsc');
  console.log('TypeScript compilation successful');
} catch (error) {
  console.error('Error compiling TypeScript:', error.message);
  console.log('Continuing with server startup anyway...');
}

// Start the fixed server
console.log('Starting fixed server implementation...');
import './src/api/server-fix.js';