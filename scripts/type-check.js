#!/usr/bin/env node
/**
 * TypeScript Check Script
 * 
 * This script runs TypeScript's type checking without emitting files
 * to verify that the codebase is free of TypeScript errors.
 * 
 * Usage:
 *   node scripts/type-check.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

console.log(`${colors.cyan}${colors.bold}Running TypeScript type checking...${colors.reset}`);

try {
  // Run TypeScript compiler in noEmit mode
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  
  console.log(`\n${colors.green}${colors.bold}✓ Type checking passed successfully!${colors.reset}`);
  // In ES modules, we need to use a different approach
  process.exitCode = 0;
} catch (error) {
  console.error(`\n${colors.red}${colors.bold}✗ Type checking failed with errors.${colors.reset}`);
  
  // Provide suggestions for common errors
  console.log(`\n${colors.yellow}Common fixes for TypeScript errors:${colors.reset}`);
  console.log(`  • ${colors.cyan}String vs. Enum conversion:${colors.reset} Use 'TaskType.X.toString()' when storing TaskType values as strings`);
  console.log(`  • ${colors.cyan}Missing properties:${colors.reset} Ensure all required interface properties are provided`);
  console.log(`  • ${colors.cyan}Unused imports/variables:${colors.reset} Remove unused code or mark with underscore (_variableName)`);
  console.log(`  • ${colors.cyan}Type compatibility:${colors.reset} Use proper type assertions or update interfaces to match actual usage`);
  
  // Set exit code for proper process termination
  process.exitCode = 1;
}