#!/usr/bin/env node
/**
 * CI Check for Default Secrets
 * 
 * This script checks for default or insecure secrets in the codebase.
 * It should be run as part of the CI pipeline to prevent committing
 * default secrets to production.
 * 
 * Usage: node ci/check-secrets.js [--strict]
 * 
 * Options:
 *   --strict  Exit with error if any default secrets are found
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Default values that should not be committed
const DEFAULT_VALUES = {
  // Encryption keys
  ENCRYPTION_KEY: [
    'default-dev-key-should-change-in-production',
    'default-dev-key-do-not-use-in-production-environment',
    'temporary-encryption-key'
  ],
  
  // API keys
  SENDGRID_API_KEY: [
    'SG.your-sendgrid-api-key',
    'test-sendgrid-api-key'
  ],
  OPENAI_API_KEY: [
    'sk-your-openai-api-key',
    'test-openai-api-key',
    'sk_test_'
  ],
  EKO_API_KEY: [
    'eko-your-api-key',
    'test-eko-api-key'
  ],
  
  // Database credentials
  DATABASE_URL: [
    'postgresql://user:password@localhost:5432/dbname',
    'postgresql://test:test@localhost:5432/test'
  ],
  
  // Email credentials
  OTP_EMAIL_USER: [
    'your_email_username',
    'test@example.com'
  ],
  OTP_EMAIL_PASS: [
    'your_email_password',
    'test-password'
  ],
  
  // CRM credentials
  VIN_SOLUTIONS_USERNAME: [
    'your_vinsolutions_username'
  ],
  VIN_SOLUTIONS_PASSWORD: [
    'your_vinsolutions_password'
  ],
  VAUTO_USERNAME: [
    'your_vauto_username'
  ],
  VAUTO_PASSWORD: [
    'your_vauto_password'
  ]
};

// Patterns to search for in the codebase
const PATTERNS = {
  // Environment variable assignments
  ENV_ASSIGNMENT: /process\.env\.([A-Z_]+)\s*=\s*['"]([^'"]+)['"]/g,
  
  // Default values in code
  DEFAULT_VALUE: /['"]?([A-Z_]+)['"]?\s*:\s*['"]([^'"]+)['"]/g,
  
  // Hardcoded secrets
  HARDCODED_SECRET: /(password|secret|key|token|credential)s?\s*[:=]\s*['"]([^'"]{8,})['"](?!\s*\|\|\s*process\.env)/gi,
  
  // API keys
  API_KEY: /['"](?:sk|pk)_(?:test|live)_[a-zA-Z0-9]{24,}['"]/g,
  
  // Base64 encoded data that might be secrets
  BASE64_DATA: /['"](?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?['"](?!\s*\|\|\s*process\.env)/g
};

// Files and directories to ignore
const IGNORE_PATHS = [
  'node_modules',
  'dist',
  '.git',
  'coverage',
  'ci/check-secrets.js', // Ignore this file
  'src/utils/envValidator.ts', // Ignore the validator file that contains the defaults
  'src/__tests__', // Ignore test files
  'jest.setup.js', // Ignore Jest setup
  '.env.example' // Ignore example env file
];

// Parse command line arguments
const args = process.argv.slice(2);
const strictMode = args.includes('--strict');

// Get the root directory of the project
const rootDir = execSync('git rev-parse --show-toplevel').toString().trim();

// Results storage
const results = {
  defaultSecrets: [],
  hardcodedSecrets: [],
  suspiciousPatterns: []
};

/**
 * Check if a file should be ignored
 * @param {string} filePath - Path to the file
 * @returns {boolean} - True if the file should be ignored
 */
function shouldIgnore(filePath) {
  return IGNORE_PATHS.some(ignorePath => filePath.includes(ignorePath));
}

/**
 * Check if a value matches any default values
 * @param {string} key - Environment variable name
 * @param {string} value - Value to check
 * @returns {boolean} - True if the value matches a default
 */
function isDefaultValue(key, value) {
  const defaults = DEFAULT_VALUES[key];
  if (!defaults) return false;
  
  return defaults.some(defaultValue => 
    value === defaultValue || 
    value.includes(defaultValue)
  );
}

/**
 * Scan a file for default secrets
 * @param {string} filePath - Path to the file
 */
function scanFile(filePath) {
  if (shouldIgnore(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(rootDir, filePath);
    
    // Check for environment variable assignments
    let match;
    while ((match = PATTERNS.ENV_ASSIGNMENT.exec(content)) !== null) {
      const [fullMatch, key, value] = match;
      if (isDefaultValue(key, value)) {
        results.defaultSecrets.push({
          file: relativePath,
          line: getLineNumber(content, match.index),
          key,
          value,
          type: 'environment variable assignment'
        });
      }
    }
    
    // Check for default values in code
    PATTERNS.DEFAULT_VALUE.lastIndex = 0; // Reset regex index
    while ((match = PATTERNS.DEFAULT_VALUE.exec(content)) !== null) {
      const [fullMatch, key, value] = match;
      if (isDefaultValue(key, value)) {
        results.defaultSecrets.push({
          file: relativePath,
          line: getLineNumber(content, match.index),
          key,
          value,
          type: 'default value in code'
        });
      }
    }
    
    // Check for hardcoded secrets
    PATTERNS.HARDCODED_SECRET.lastIndex = 0;
    while ((match = PATTERNS.HARDCODED_SECRET.exec(content)) !== null) {
      const [fullMatch, type, value] = match;
      results.hardcodedSecrets.push({
        file: relativePath,
        line: getLineNumber(content, match.index),
        type,
        // Mask the value for security
        value: value.substring(0, 3) + '...' + value.substring(value.length - 3)
      });
    }
    
    // Check for API keys
    PATTERNS.API_KEY.lastIndex = 0;
    while ((match = PATTERNS.API_KEY.exec(content)) !== null) {
      const [value] = match;
      results.suspiciousPatterns.push({
        file: relativePath,
        line: getLineNumber(content, match.index),
        type: 'API key',
        // Mask the value for security
        value: value.substring(0, 6) + '...' + value.substring(value.length - 4)
      });
    }
    
    // Check for Base64 data that might be secrets
    PATTERNS.BASE64_DATA.lastIndex = 0;
    while ((match = PATTERNS.BASE64_DATA.exec(content)) !== null) {
      const [value] = match;
      // Only report if it's not in a test file and looks like a secret
      if (!filePath.includes('test') && value.length > 40) {
        results.suspiciousPatterns.push({
          file: relativePath,
          line: getLineNumber(content, match.index),
          type: 'Base64 data',
          // Mask the value for security
          value: value.substring(0, 6) + '...' + value.substring(value.length - 4)
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error.message);
  }
}

/**
 * Get the line number for a position in a string
 * @param {string} content - File content
 * @param {number} position - Position in the string
 * @returns {number} - Line number (1-based)
 */
function getLineNumber(content, position) {
  const lines = content.substring(0, position).split('\n');
  return lines.length;
}

/**
 * Recursively scan a directory for files
 * @param {string} dir - Directory to scan
 */
function scanDirectory(dir) {
  if (shouldIgnore(dir)) return;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (stat.isFile()) {
      scanFile(filePath);
    }
  }
}

// Start scanning from the root directory
console.log('Scanning for default and hardcoded secrets...');
scanDirectory(rootDir);

// Print results
let exitCode = 0;

if (results.defaultSecrets.length > 0) {
  console.log('\n🚨 Default secrets found:');
  results.defaultSecrets.forEach(result => {
    console.log(`  ${result.file}:${result.line} - ${result.key}: ${result.value} (${result.type})`);
  });
  exitCode = strictMode ? 1 : exitCode;
} else {
  console.log('\n✅ No default secrets found');
}

if (results.hardcodedSecrets.length > 0) {
  console.log('\n⚠️ Hardcoded secrets found:');
  results.hardcodedSecrets.forEach(result => {
    console.log(`  ${result.file}:${result.line} - ${result.type}: ${result.value}`);
  });
  exitCode = strictMode ? 1 : exitCode;
} else {
  console.log('✅ No hardcoded secrets found');
}

if (results.suspiciousPatterns.length > 0) {
  console.log('\n⚠️ Suspicious patterns found:');
  results.suspiciousPatterns.forEach(result => {
    console.log(`  ${result.file}:${result.line} - ${result.type}: ${result.value}`);
  });
} else {
  console.log('✅ No suspicious patterns found');
}

// Summary
const totalIssues = results.defaultSecrets.length + results.hardcodedSecrets.length;
if (totalIssues > 0) {
  console.log(`\n🚨 Found ${totalIssues} security issues that need to be fixed.`);
  if (strictMode) {
    console.log('Exiting with error code 1 (strict mode)');
  } else {
    console.log('Warnings only (use --strict to fail the build)');
  }
} else {
  console.log('\n✅ No security issues found');
}

process.exit(exitCode);
