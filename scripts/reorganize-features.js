#!/usr/bin/env node

/**
 * Script to reorganize the codebase into a feature-based structure
 * 
 * This script:
 * 1. Creates a feature-based directory structure
 * 2. Moves related files into feature directories
 * 3. Updates import paths in the moved files
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Define paths
const srcDir = path.join(process.cwd(), 'src');
const featuresDir = path.join(srcDir, 'features');

// Define feature directories
const features = [
  'auth',
  'email',
  'scheduler',
  'workflow',
  'insights',
  'monitoring',
  'credentials',
  'health',
];

// Create feature directories
features.forEach(feature => {
  const featureDir = path.join(featuresDir, feature);
  if (!fs.existsSync(featureDir)) {
    fs.mkdirSync(featureDir, { recursive: true });
    
    // Create subdirectories for each feature
    ['components', 'services', 'routes', 'types', 'utils'].forEach(subdir => {
      fs.mkdirSync(path.join(featureDir, subdir), { recursive: true });
    });
    
    console.log(`Created feature directory: ${featureDir}`);
  }
});

// Function to recursively get all files in a directory
function getAllFiles(dirPath, arrayOfFiles = [], extensions = ['.ts', '.js']) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles, extensions);
    } else {
      const ext = path.extname(filePath);
      if (extensions.includes(ext)) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

// Function to determine which feature a file belongs to
function getFeatureForFile(filePath) {
  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Map of keywords to features
  const featureKeywords = {
    auth: ['auth', 'authentication', 'authorization', 'login', 'logout', 'register', 'user'],
    email: ['email', 'mail', 'smtp', 'imap', 'notification'],
    scheduler: ['schedule', 'cron', 'job', 'task', 'recurring'],
    workflow: ['workflow', 'flow', 'step', 'process'],
    insights: ['insight', 'analytics', 'report', 'analysis'],
    monitoring: ['monitor', 'metric', 'log', 'trace', 'performance'],
    credentials: ['credential', 'secret', 'key', 'token', 'vault'],
    health: ['health', 'status', 'check', 'heartbeat'],
  };
  
  // Check file name and content for keywords
  for (const [feature, keywords] of Object.entries(featureKeywords)) {
    for (const keyword of keywords) {
      if (
        fileName.toLowerCase().includes(keyword.toLowerCase()) ||
        fileContent.toLowerCase().includes(keyword.toLowerCase())
      ) {
        return feature;
      }
    }
  }
  
  // Default to null if no feature is matched
  return null;
}

// Function to determine the subdirectory for a file within a feature
function getSubdirectoryForFile(filePath) {
  const fileName = path.basename(filePath);
  
  if (fileName.includes('.route.') || fileName.includes('routes') || filePath.includes('/routes/')) {
    return 'routes';
  }
  
  if (fileName.includes('.service.') || fileName.includes('Service') || filePath.includes('/services/')) {
    return 'services';
  }
  
  if (fileName.includes('.component.') || fileName.includes('Component') || filePath.includes('/components/')) {
    return 'components';
  }
  
  if (fileName.includes('.type.') || fileName.includes('types') || filePath.includes('/types/')) {
    return 'types';
  }
  
  if (fileName.includes('.util.') || fileName.includes('utils') || filePath.includes('/utils/')) {
    return 'utils';
  }
  
  // Default to services
  return 'services';
}

// Function to update import paths in a file
function updateImportPaths(filePath, newFilePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Calculate the relative path difference
  const relativeToSrc = path.relative(path.dirname(newFilePath), srcDir);
  
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

// Get all source files
const sourceFiles = getAllFiles(srcDir);

// Move each file to the appropriate feature directory
sourceFiles.forEach(filePath => {
  // Skip files in the features directory (already organized)
  if (filePath.includes('/features/')) {
    return;
  }
  
  // Skip test files (already organized)
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return;
  }
  
  // Skip shared utilities and types (these are cross-cutting concerns)
  if (filePath.includes('/shared/') || filePath.includes('/utils/')) {
    return;
  }
  
  // Determine which feature this file belongs to
  const feature = getFeatureForFile(filePath);
  if (!feature) {
    return;
  }
  
  // Determine which subdirectory this file belongs to
  const subdirectory = getSubdirectoryForFile(filePath);
  
  // Create the target path
  const fileName = path.basename(filePath);
  const targetPath = path.join(featuresDir, feature, subdirectory, fileName);
  
  // Copy the file to the new location
  fs.copyFileSync(filePath, targetPath);
  console.log(`Copied ${filePath} to ${targetPath}`);
  
  // Update import paths in the copied file
  updateImportPaths(filePath, targetPath);
  console.log(`Updated import paths in ${targetPath}`);
});

console.log('Feature-based reorganization completed successfully!');
console.log('Note: Original files have been preserved. Review the new structure and update imports as needed.');
