#!/usr/bin/env node

/**
 * API Documentation Setup Script
 * 
 * This script installs the necessary dependencies for API documentation and SDK generation.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Dependencies to install
const dependencies = [
  'swagger-ui-express',
  'yamljs',
];

const devDependencies = [
  '@openapitools/openapi-generator-cli',
];

console.log('Setting up API documentation and SDK generation...');

// Install dependencies
console.log('\nInstalling dependencies...');
try {
  execSync(`npm install --save ${dependencies.join(' ')}`, { stdio: 'inherit' });
  console.log('Dependencies installed successfully.');
} catch (error) {
  console.error('Error installing dependencies:', error);
  process.exit(1);
}

// Install dev dependencies
console.log('\nInstalling dev dependencies...');
try {
  execSync(`npm install --save-dev ${devDependencies.join(' ')}`, { stdio: 'inherit' });
  console.log('Dev dependencies installed successfully.');
} catch (error) {
  console.error('Error installing dev dependencies:', error);
  process.exit(1);
}

// Update package.json with new scripts
console.log('\nUpdating package.json...');
try {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add scripts
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts['generate-sdk'] = 'node scripts/generate-sdk.js';
  packageJson.scripts['api-docs'] = 'node scripts/generate-api-docs.js';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('package.json updated successfully.');
} catch (error) {
  console.error('Error updating package.json:', error);
  process.exit(1);
}

// Create directories if they don't exist
console.log('\nCreating directories...');
try {
  const directories = [
    'docs/openapi',
    'src/client-sdk',
  ];
  
  for (const dir of directories) {
    const dirPath = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
} catch (error) {
  console.error('Error creating directories:', error);
  process.exit(1);
}

console.log('\nAPI documentation and SDK generation setup completed successfully!');
console.log('\nNext steps:');
console.log('1. Run the API server: npm run start-server');
console.log('2. Access the API documentation at: http://localhost:5000/api-docs');
console.log('3. Generate the TypeScript SDK: npm run generate-sdk');
