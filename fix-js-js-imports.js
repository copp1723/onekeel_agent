#!/usr/bin/env node
/**
 * Fix .js.js Double Extension Imports Script
 *
 * This script specifically targets and fixes the .js.js double extension issue in import statements
 * across the entire TypeScript codebase. It also handles other common import path issues.
 *
 * Features:
 * 1. Fixes double .js.js extensions in import statements
 * 2. Fixes ellipsis imports ('...') with proper paths
 * 3. Handles both regular and type-only imports
 * 4. Provides detailed logging of changes
 * 5. Runs TypeScript check after fixes to verify success
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Statistics tracking
const stats = {
  filesScanned: 0,
  filesFixed: 0,
  doubleJsExtensionsFixed: 0,
  ellipsisImportsFixed: 0,
  totalFixesMade: 0
};

console.log(`${colors.bold}${colors.cyan}Starting .js.js import path fix...${colors.reset}`);

/**
 * Fix double .js.js extensions in import statements
 * @param {string} filePath - Path to the file to fix
 * @returns {boolean} - Whether any fixes were made
 */
function fixDoubleJsExtensions(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}File not found: ${filePath}${colors.reset}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fixesMade = 0;

  // Fix double .js.js extensions in regular imports
  const updatedContent1 = content.replace(
    /from\s+(['"])([^'"]*?)\.js\.js(['"])/g,
    (match, openQuote, importPath, closeQuote) => {
      fixesMade++;
      return `from ${openQuote}${importPath}.js${closeQuote}`;
    }
  );

  // Fix double .js.js extensions in type imports
  const updatedContent2 = updatedContent1.replace(
    /import\s+type\s+{[^}]+}\s+from\s+(['"])([^'"]*?)\.js\.js(['"])/g,
    (match, openQuote, importPath, closeQuote) => {
      fixesMade++;
      return match.replace(`${importPath}.js.js`, `${importPath}.js`);
    }
  );

  // Fix triple or more .js extensions (e.g., .js.js.js)
  const updatedContent3 = updatedContent2.replace(
    /from\s+(['"])([^'"]*?)(\.js){2,}(['"])/g,
    (match, openQuote, importPath, jsExtensions, closeQuote) => {
      fixesMade++;
      return `from ${openQuote}${importPath}.js${closeQuote}`;
    }
  );

  if (fixesMade > 0) {
    fs.writeFileSync(filePath, updatedContent3, 'utf8');
    console.log(`${colors.green}Fixed ${fixesMade} double .js extensions in ${filePath}${colors.reset}`);
    stats.doubleJsExtensionsFixed += fixesMade;
    stats.totalFixesMade += fixesMade;
    return true;
  }

  return false;
}

/**
 * Fix ellipsis imports ('...') with proper paths
 * @param {string} filePath - Path to the file to fix
 * @returns {boolean} - Whether any fixes were made
 */
function fixEllipsisImports(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}File not found: ${filePath}${colors.reset}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fixesMade = 0;

  // Fix imports from '...' to proper paths
  const updatedContent = content.replace(
    /from\s+(['"])\.\.\.(['"])/g,
    (match, openQuote, closeQuote) => {
      fixesMade++;

      // Determine the appropriate import based on the file context
      if (filePath.includes('utils/')) {
        return `from ${openQuote}./errorUtils.js${closeQuote}`;
      } else if (filePath.includes('workers/')) {
        return `from ${openQuote}../utils/errorUtils.js${closeQuote}`;
      } else if (filePath.includes('services/')) {
        return `from ${openQuote}../utils/errorUtils.js${closeQuote}`;
      } else if (filePath.includes('agents/')) {
        return `from ${openQuote}../utils/errorUtils.js${closeQuote}`;
      } else if (filePath.includes('__tests__/')) {
        return `from ${openQuote}../../utils/errorUtils.js${closeQuote}`;
      } else {
        return `from ${openQuote}../utils/errorUtils.js${closeQuote}`;
      }
    }
  );

  if (fixesMade > 0) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`${colors.green}Fixed ${fixesMade} ellipsis imports in ${filePath}${colors.reset}`);
    stats.ellipsisImportsFixed += fixesMade;
    stats.totalFixesMade += fixesMade;
    return true;
  }

  return false;
}

/**
 * Fix imports from '....' (four dots) which should be '..' (two dots)
 * @param {string} filePath - Path to the file to fix
 * @returns {boolean} - Whether any fixes were made
 */
function fixFourDotsImports(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}File not found: ${filePath}${colors.reset}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fixesMade = 0;

  // Fix imports with '....' which should be '..'
  const updatedContent = content.replace(
    /from\s+(['"])(\.\.\.\.)\/([^'"]*?)(['"])/g,
    (match, openQuote, dots, importPath, closeQuote) => {
      fixesMade++;
      return `from ${openQuote}../${importPath}${closeQuote}`;
    }
  );

  if (fixesMade > 0) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`${colors.green}Fixed ${fixesMade} four-dots imports in ${filePath}${colors.reset}`);
    stats.totalFixesMade += fixesMade;
    return true;
  }

  return false;
}

/**
 * Get all TypeScript files in a directory and its subdirectories
 * @param {string} directory - Directory to search
 * @returns {string[]} - Array of file paths
 */
function getAllTypeScriptFiles(directory) {
  const files = [];

  function traverseDirectory(dir) {
    try {
      console.log(`${colors.blue}Scanning directory: ${dir}${colors.reset}`);
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
          traverseDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error reading directory ${dir}: ${error.message}${colors.reset}`);
    }
  }

  traverseDirectory(directory);
  console.log(`${colors.cyan}Found ${files.length} TypeScript files${colors.reset}`);
  return files;
}

/**
 * Process all TypeScript files in a directory
 * @param {string} directory - Directory to process
 */
function processTypeScriptFiles(directory) {
  const tsFiles = getAllTypeScriptFiles(directory);
  console.log(`${colors.cyan}Found ${tsFiles.length} TypeScript files${colors.reset}`);
  stats.filesScanned = tsFiles.length;

  for (const filePath of tsFiles) {
    const fixed1 = fixDoubleJsExtensions(filePath);
    const fixed2 = fixEllipsisImports(filePath);
    const fixed3 = fixFourDotsImports(filePath);

    if (fixed1 || fixed2 || fixed3) {
      stats.filesFixed++;
    }
  }
}

// Main execution
try {
  // Print debug information
  console.log(`${colors.bold}${colors.magenta}Debug Information:${colors.reset}`);
  console.log(`${colors.yellow}Current directory: ${process.cwd()}${colors.reset}`);
  console.log(`${colors.yellow}Script directory: ${__dirname}${colors.reset}`);
  console.log(`${colors.yellow}Root directory: ${rootDir}${colors.reset}`);

  // List directories in current directory
  console.log(`${colors.cyan}Listing directories in current directory:${colors.reset}`);
  try {
    const entries = fs.readdirSync(process.cwd(), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        console.log(`${colors.green}Directory: ${entry.name}${colors.reset}`);
      } else {
        console.log(`File: ${entry.name}`);
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error listing directories: ${error.message}${colors.reset}`);
  }

  // Check if src directory exists
  const srcDir = path.join(rootDir, 'src');
  console.log(`${colors.cyan}Checking for src directory at: ${srcDir}${colors.reset}`);

  if (!fs.existsSync(srcDir)) {
    console.error(`${colors.red}Error: src directory not found at ${srcDir}${colors.reset}`);

    // Try to find the src directory
    console.log(`${colors.cyan}Attempting to find src directory...${colors.reset}`);
    const currentDir = process.cwd();
    const possibleSrcDir = path.join(currentDir, 'src');

    if (fs.existsSync(possibleSrcDir)) {
      console.log(`${colors.green}Found src directory at: ${possibleSrcDir}${colors.reset}`);
      processTypeScriptFiles(possibleSrcDir);
    } else {
      throw new Error('src directory not found');
    }
  } else {
    // Process src directory
    console.log(`${colors.cyan}Processing src directory...${colors.reset}`);
    processTypeScriptFiles(srcDir);
  }

  // Print statistics
  console.log(`\n${colors.bold}${colors.blue}Fix Summary:${colors.reset}`);
  console.log(`${colors.cyan}Files scanned: ${stats.filesScanned}${colors.reset}`);
  console.log(`${colors.green}Files fixed: ${stats.filesFixed}${colors.reset}`);
  console.log(`${colors.green}Double .js extensions fixed: ${stats.doubleJsExtensionsFixed}${colors.reset}`);
  console.log(`${colors.green}Ellipsis imports fixed: ${stats.ellipsisImportsFixed}${colors.reset}`);
  console.log(`${colors.green}Total fixes made: ${stats.totalFixesMade}${colors.reset}`);

  console.log(`\n${colors.bold}${colors.green}Import path fixes completed!${colors.reset}`);

  // Run TypeScript check to see if we fixed all errors
  console.log(`\n${colors.bold}${colors.yellow}Running TypeScript check...${colors.reset}`);
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log(`${colors.bold}${colors.green}TypeScript check completed!${colors.reset}`);
  } catch (tscError) {
    console.error(`${colors.bold}${colors.red}TypeScript check failed, but import fixes were applied.${colors.reset}`);
    console.error(`${colors.yellow}There may be other TypeScript errors that need to be fixed.${colors.reset}`);
  }
} catch (error) {
  console.error(`${colors.bold}${colors.red}Error: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
}
