#!/usr/bin/env node

// This script fixes import statements in TypeScript files
// for ES modules by adding .js extensions to relative imports
// This is necessary because ES modules require file extensions

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, 'src');
const excludeDirs = ['node_modules', 'dist']; 

// Regular expression to match relative imports that don't end with file extensions
const importRegex = /from\s+['"](\.[^'"]*)['"]/g;

// Check if a string ends with a file extension
function hasFileExtension(str) {
  return /\.\w+$/.test(str);
}

// Process a single file
function processFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Replace imports without extensions
    const newContent = content.replace(importRegex, (match, importPath) => {
      // Skip if already has an extension or if it's a package import
      if (hasFileExtension(importPath)) {
        return match;
      }
      
      modified = true;
      return `from '${importPath}.js'`;
    });
    
    // Only write back if changes were made
    if (modified) {
      console.log(`Fixed imports in: ${filePath}`);
      fs.writeFileSync(filePath, newContent, 'utf-8');
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Recursively process all files in a directory
function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        processDirectory(entryPath);
      }
    } else {
      processFile(entryPath);
    }
  }
}

// Start processing from the root directory
console.log('Fixing import statements to add .js extensions for ES modules...');
processDirectory(rootDir);
console.log('Done!');