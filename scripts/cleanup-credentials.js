/**
 * Cleanup Script: Remove Credential-Related Code
 * 
 * This script helps clean up any remaining credential-related code after
 * migrating to email-only ingestion.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const PKG_JSON = path.join(ROOT_DIR, 'package.json');

// Files and directories to remove
const FILES_TO_REMOVE = [
  'src/client/components/CredentialVault.ts',
  'src/features/auth/services/credentialVault.ts',
  'src/features/auth/routes/credentials.ts',
  'src/agents/fetchAndAnalyzeCRMReport.ts',
  'src/agents/fetchCRMReport.ts',
  'src/agents/hybridIngestAndRunFlow.ts',
  'src/agents/hybridIngestAndRunFlow.test.ts',
];

// Dependencies to remove from package.json
const DEPS_TO_REMOVE = [
  'playwright',
  'puppeteer',
  'playwright-core',
  'puppeteer-core',
  'tough-cookie',
  'browserless',
  'puppeteer-extra',
  'puppeteer-extra-plugin-stealth'
];

// Patterns to remove from files
const PATTERNS_TO_REMOVE = [
  // Import statements
  /import\s+.*[cC]redential.*\s+from\s+['"].*['"]\s*;?\n/gi,
  // Type references
  /type\s+\w*[cC]redential\w*\s*=.*;?\n/gi,
  // Credential interfaces
  /interface\s+\w*[cC]redential\w*\s*\{[\s\S]*?\}\n/gi,
];

// Clean up files
console.log('🚀 Cleaning up credential-related files...');
FILES_TO_REMOVE.forEach(file => {
  const fullPath = path.join(ROOT_DIR, file);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`✅ Removed: ${file}`);
    } catch (error) {
      console.error(`❌ Error processing ${fullPath}:`, error.message);
    }
  } else {
    console.log(`ℹ️  Not found: ${file}`);
  }
});

// Remove dependencies from package.json
console.log('\n📦 Updating package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync(PKG_JSON, 'utf8'));
  let updated = false;
  
  // Remove from dependencies
  if (pkg.dependencies) {
    DEPS_TO_REMOVE.forEach(dep => {
      if (pkg.dependencies[dep]) {
        delete pkg.dependencies[dep];
        console.log(`✅ Removed dependency: ${dep}`);
        updated = true;
      }
    });
  }
  
  // Remove from devDependencies
  if (pkg.devDependencies) {
    DEPS_TO_REMOVE.forEach(dep => {
      if (pkg.devDependencies[dep]) {
        delete pkg.devDependencies[dep];
        console.log(`✅ Removed devDependency: ${dep}`);
        updated = true;
      }
    });
  }
  
  if (updated) {
    fs.writeFileSync(PKG_JSON, JSON.stringify(pkg, null, 2) + '\n');
    console.log('✅ Updated package.json');
  } else {
    console.log('ℹ️  No dependencies to remove from package.json');
  }
} catch (error) {
  console.error('❌ Failed to update package.json:', error.message);
}

// Clean up patterns in files
console.log('\n🧹 Cleaning up credential-related patterns in files...');
function processDirectory(directory) {
  if (!fs.existsSync(directory)) {
    console.log(`ℹ️  Directory not found: ${directory}`);
    return;
  }
  
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    
    try {
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other directories
        if (!['node_modules', '.git', 'dist', 'build', 'coverage', '.DS_Store'].includes(file)) {
          processDirectory(fullPath);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        // Process TypeScript and JavaScript files
        try {
          let content = fs.readFileSync(fullPath, 'utf8');
          let modified = false;
          
          PATTERNS_TO_REMOVE.forEach((pattern) => {
            if (pattern.test(content)) {
              content = content.replace(pattern, '');
              modified = true;
            }
          });
          
          if (modified) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`✅ Updated: ${path.relative(ROOT_DIR, fullPath)}`);
          }
        } catch (error) {
          console.error(`❌ Error processing ${path.relative(ROOT_DIR, fullPath)}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ Error accessing ${path.relative(ROOT_DIR, fullPath)}:`, error.message);
    }
  });
}

// Start processing from the src directory
processDirectory(path.join(ROOT_DIR, 'src'));

console.log('\n✨ Cleanup complete!');
console.log('\nNext steps:');
console.log('1. Run database migrations to remove credential tables');
console.log('2. Run `npm install` to update dependencies');
console.log('3. Run tests to ensure everything works as expected');
