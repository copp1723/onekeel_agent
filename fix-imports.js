#!/usr/bin/env node
/**
 * Fix TypeScript Imports Script
 *
 * This script fixes import paths in TypeScript files by:
 * 1. Removing double .js extensions (.js.js)
 * 2. Removing .js extensions from imports to TypeScript files
 * 3. Fixing relative imports with incorrect paths
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

console.log(`${colors.cyan}${colors.bold}Fixing TypeScript imports...${colors.reset}`);

// Fix double .js extensions
function fixDoubleJsExtensions(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}File not found: ${filePath}${colors.reset}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix double .js extensions
  const updatedContent = content.replace(
    /from\s+(['"])([^'"]*?)\.js\.js(['"])/g,
    (match, openQuote, importPath, closeQuote) => {
      return `from ${openQuote}${importPath}.js${closeQuote}`;
    }
  );

  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`${colors.green}Fixed double .js extensions in ${filePath}${colors.reset}`);
    return true;
  }
  return false;
}

// Fix incorrect relative imports
function fixIncorrectRelativeImports(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}File not found: ${filePath}${colors.reset}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix imports with '....' which should be '..'
  const updatedContent = content.replace(
    /from\s+(['"])(\.\.\.\.)\/([^'"]*?)(['"])/g,
    (match, openQuote, dots, importPath, closeQuote) => {
      return `from ${openQuote}../${importPath}${closeQuote}`;
    }
  );

  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`${colors.green}Fixed incorrect relative imports in ${filePath}${colors.reset}`);
    return true;
  }
  return false;
}

// Get all TypeScript files
function getAllTypeScriptFiles(directory) {
  const files = [];

  function traverseDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        traverseDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }

  traverseDirectory(directory);
  return files;
}

// Process all TypeScript files
function processTypeScriptFiles(directory) {
  const tsFiles = getAllTypeScriptFiles(directory);
  console.log(`${colors.cyan}Found ${tsFiles.length} TypeScript files${colors.reset}`);

  let fixedFiles = 0;
  for (const filePath of tsFiles) {
    const fixed1 = fixDoubleJsExtensions(filePath);
    const fixed2 = fixIncorrectRelativeImports(filePath);
    if (fixed1 || fixed2) fixedFiles++;
  }

  console.log(`${colors.green}Fixed imports in ${fixedFiles} files${colors.reset}`);
}

// Main execution
const rootDir = path.resolve(__dirname, 'src');
processTypeScriptFiles(rootDir);

console.log(`${colors.bold}${colors.green}TypeScript import fixes completed!${colors.reset}`);

// Run TypeScript check to see if we fixed all errors
console.log(`${colors.bold}${colors.yellow}Running TypeScript check...${colors.reset}`);
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log(`${colors.bold}${colors.green}TypeScript check passed!${colors.reset}`);
} catch (error) {
  console.error(`${colors.bold}${colors.red}TypeScript check failed. Some errors remain.${colors.reset}`);
  process.exit(1);
}