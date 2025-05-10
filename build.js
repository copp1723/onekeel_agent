#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Ensure .env file exists
if (!fs.existsSync('.env')) {
  console.log('Creating .env file from .env.example');
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
  } else {
    console.log('Warning: .env.example not found, creating empty .env file');
    fs.writeFileSync('.env', '# Environment Variables\n');
  }
}

// Run typescript compiler
console.log('Compiling TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compilation successful');
} catch (error) {
  console.error('TypeScript compilation failed:', error.message);
  process.exit(1);
}

// Run database setup if needed
console.log('Setting up database...');
try {
  execSync('node dist/scripts/setup-db.js', { stdio: 'inherit' });
  console.log('Database setup complete');
} catch (error) {
  console.error('Database setup failed:', error.message);
  // We continue even if database setup fails
}

console.log('Build completed successfully');