#!/usr/bin/env node
/**
 * Simple script to fix .js.js double extension issues in import statements
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  doubleJsExtensionsFixed: 0
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
    return true;
  }

  return false;
}

/**
 * Process all TypeScript files in a directory
 * @param {string} directory - Directory to process
 */
function processFiles(directory) {
  console.log(`${colors.cyan}Processing directory: ${directory}${colors.reset}`);

  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        processFiles(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        stats.filesScanned++;
        const fixed = fixDoubleJsExtensions(fullPath);
        if (fixed) {
          stats.filesFixed++;
        }
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error processing directory ${directory}: ${error.message}${colors.reset}`);
  }
}

// Main execution
try {
  // Print debug information
  console.log(`${colors.bold}${colors.magenta}Debug Information:${colors.reset}`);
  console.log(`${colors.yellow}Current directory: ${process.cwd()}${colors.reset}`);

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
  const srcDir = path.join(process.cwd(), 'src');
  console.log(`${colors.cyan}Checking for src directory at: ${srcDir}${colors.reset}`);

  if (!fs.existsSync(srcDir)) {
    console.error(`${colors.red}Error: src directory not found at ${srcDir}${colors.reset}`);
    throw new Error('src directory not found');
  } else {
    // Process src directory
    console.log(`${colors.cyan}Processing src directory...${colors.reset}`);
    processFiles(srcDir);
  }

  // Print statistics
  console.log(`\n${colors.bold}${colors.blue}Fix Summary:${colors.reset}`);
  console.log(`${colors.cyan}Files scanned: ${stats.filesScanned}${colors.reset}`);
  console.log(`${colors.green}Files fixed: ${stats.filesFixed}${colors.reset}`);
  console.log(`${colors.green}Double .js extensions fixed: ${stats.doubleJsExtensionsFixed}${colors.reset}`);

  console.log(`\n${colors.bold}${colors.green}Import path fixes completed!${colors.reset}`);
} catch (error) {
  console.error(`${colors.bold}${colors.red}Error: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
}
