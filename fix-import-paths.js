#!/usr/bin/env node

/**
 * Script to fix import paths in TypeScript files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix import paths to include .js extension
function fixImportPaths(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix double .js extension
  const fixedContent = content.replace(
    /from\s+['"]([\.\/][^'"]*?)\.js\.js['"];/g,
    (match, importPath) => {
      return `from '${importPath}.js';`;
    }
  );
  
  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`Fixed import paths in ${filePath}`);
    return true;
  }
  
  return false;
}

// Process TypeScript files
function processTypeScriptFiles(directory) {
  const files = fs.readdirSync(directory);
  let fixedFiles = 0;
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixedFiles += processTypeScriptFiles(filePath);
    } else if (file.endsWith('.ts')) {
      if (fixImportPaths(filePath)) {
        fixedFiles++;
      }
    }
  }
  
  return fixedFiles;
}

// Main execution
console.log('Starting import path fixes...');
const fixedFiles = processTypeScriptFiles('./src');
console.log(`Fixed import paths in ${fixedFiles} files!`);
