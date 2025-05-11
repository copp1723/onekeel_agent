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
import path from 'path';

// Colors for console output
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

console.log(`${YELLOW}🔍 Running TypeScript type check...${RESET}\n`);

try {
  // Run TypeScript compiler with --noEmit to check types without generating files
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log(`\n${GREEN}✅ TypeScript check passed! No type errors found.${RESET}`);
  process.exit(0);
} catch (error) {
  console.error(`\n${RED}❌ TypeScript check failed with errors.${RESET}`);
  console.log(`\n${CYAN}Tip: Run with 'npx tsc --noEmit' to see detailed errors.${RESET}`);
  process.exit(1);
}