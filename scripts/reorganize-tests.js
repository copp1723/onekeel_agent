#!/usr/bin/env node

/**
 * Script to reorganize test files into a dedicated test directory structure
 * 
 * This script:
 * 1. Creates a new test directory structure (tests/unit, tests/integration, tests/e2e)
 * 2. Moves test files from src/__tests__ to the appropriate test directories
 * 3. Updates import paths in the moved test files
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Define paths
const srcTestsDir = path.join(process.cwd(), 'src', '__tests__');
const unitTestsDir = path.join(process.cwd(), 'tests', 'unit');
const integrationTestsDir = path.join(process.cwd(), 'tests', 'integration');
const e2eTestsDir = path.join(process.cwd(), 'tests', 'e2e');

// Create directories if they don't exist
[unitTestsDir, integrationTestsDir, e2eTestsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Function to recursively get all files in a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Function to determine the test type based on file path or content
function getTestType(filePath) {
  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Check if it's an integration test
  if (
    filePath.includes('/integration/') || 
    fileName.includes('.integration.') || 
    fileName.includes('.spec.') ||
    fileContent.includes('integration test') ||
    fileContent.includes('Integration Test')
  ) {
    return 'integration';
  }
  
  // Check if it's an e2e test
  if (
    filePath.includes('/e2e/') || 
    fileName.includes('.e2e.') ||
    fileContent.includes('end-to-end') ||
    fileContent.includes('End-to-End') ||
    fileContent.includes('E2E')
  ) {
    return 'e2e';
  }
  
  // Default to unit test
  return 'unit';
}

// Function to update import paths in a file
function updateImportPaths(filePath, newFilePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Calculate the relative path difference
  const relativeToSrc = path.relative(path.dirname(newFilePath), path.join(process.cwd(), 'src'));
  
  // Update import paths
  content = content.replace(/from ['"]\.\.\/([^'"]+)['"]/g, (match, importPath) => {
    return `from '${relativeToSrc}/${importPath}'`;
  });
  
  content = content.replace(/from ['"]\.\.\/\.\.\/([^'"]+)['"]/g, (match, importPath) => {
    return `from '${relativeToSrc}/${importPath}'`;
  });
  
  content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/([^'"]+)['"]/g, (match, importPath) => {
    return `from '${relativeToSrc}/${importPath}'`;
  });
  
  fs.writeFileSync(newFilePath, content);
}

// Get all test files
const testFiles = getAllFiles(srcTestsDir);

// Move each test file to the appropriate directory
testFiles.forEach(filePath => {
  const testType = getTestType(filePath);
  const relativePath = path.relative(srcTestsDir, filePath);
  let targetDir;
  
  switch (testType) {
    case 'integration':
      targetDir = integrationTestsDir;
      break;
    case 'e2e':
      targetDir = e2eTestsDir;
      break;
    default:
      targetDir = unitTestsDir;
  }
  
  const targetPath = path.join(targetDir, relativePath);
  const targetDirPath = path.dirname(targetPath);
  
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDirPath)) {
    fs.mkdirSync(targetDirPath, { recursive: true });
  }
  
  // Copy the file to the new location
  fs.copyFileSync(filePath, targetPath);
  console.log(`Copied ${filePath} to ${targetPath}`);
  
  // Update import paths in the copied file
  updateImportPaths(filePath, targetPath);
  console.log(`Updated import paths in ${targetPath}`);
});

console.log('Test files have been reorganized successfully!');
