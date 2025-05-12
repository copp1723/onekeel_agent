/**
 * Simple Test Script for Credential Vault
 * Tests basic encryption and credential operations
 */

import crypto from 'crypto';

// Key length for AES-256
const KEY_LENGTH = 32;
// IV length for AES-GCM
const IV_LENGTH = 16;
// Authentication tag length
const AUTH_TAG_LENGTH = 16;

let encryptionKey;

/**
 * Initialize encryption with a key
 * In production, this should be a securely stored environment variable
 */
function initializeEncryption(key) {
  if (key) {
    // Use provided key if available
    encryptionKey = Buffer.from(key, 'hex');
  } else {
    // Generate a temporary key (not for production)
    console.warn('Warning: Using temporary encryption key. Set ENCRYPTION_KEY in production.');
    encryptionKey = crypto.randomBytes(KEY_LENGTH);
  }
}

/**
 * Check if encryption is properly configured
 */
function isEncryptionConfigured() {
  return !!encryptionKey && encryptionKey.length === KEY_LENGTH;
}

/**
 * Encrypt data with AES-256-GCM
 */
function encryptData(data) {
  if (!isEncryptionConfigured()) {
    initializeEncryption();
  }
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher with key and IV
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  
  // Convert data to JSON string if it's an object
  const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
  
  // Encrypt data
  let encrypted = cipher.update(dataString, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine encrypted data and auth tag
  const encryptedWithTag = Buffer.concat([
    Buffer.from(encrypted, 'base64'),
    authTag
  ]).toString('base64');
  
  return {
    encryptedData: encryptedWithTag,
    iv: iv.toString('base64')
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
function decryptData(encryptedData, iv) {
  if (!isEncryptionConfigured()) {
    initializeEncryption();
  }
  
  try {
    // Decode base64 strings
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    
    // Extract auth tag (last 16 bytes)
    const authTag = encryptedBuffer.slice(encryptedBuffer.length - AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.slice(0, encryptedBuffer.length - AUTH_TAG_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, ivBuffer);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // Parse JSON if possible
    try {
      return JSON.parse(decrypted.toString('utf8'));
    } catch (e) {
      // Return as string if not valid JSON
      return decrypted.toString('utf8');
    }
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Test encryption/decryption
 */
function testEncryption() {
  try {
    const testData = { test: 'value', number: 123 };
    const { encryptedData, iv } = encryptData(testData);
    const decrypted = decryptData(encryptedData, iv);
    
    return decrypted.test === testData.test && decrypted.number === testData.number;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}

// Run a simple test
async function runSimpleTest() {
  console.log('\n=== Testing Credential Vault Encryption ===');
  
  // Test encryption
  const testResult = testEncryption();
  console.log(`Basic encryption test: ${testResult ? 'PASSED' : 'FAILED'}`);
  
  if (!testResult) {
    console.error('Encryption test failed, aborting further tests');
    process.exit(1);
  }
  
  // Encrypt some credential data
  const credentials = {
    username: 'test@example.com',
    password: 'TestPassword123',
    apiKey: 'sk_test_12345abcdef',
    apiSecret: 'secret_67890xyz',
    dealerId: 'DEALER123'
  };
  
  console.log('Encrypting credentials...');
  const { encryptedData, iv } = encryptData(credentials);
  
  console.log('Encrypted data:', encryptedData.substring(0, 20) + '...');
  console.log('IV:', iv);
  
  // Decrypt the credentials
  console.log('Decrypting credentials...');
  const decrypted = decryptData(encryptedData, iv);
  
  console.log('Decrypted credentials:');
  console.log('- Username:', decrypted.username);
  console.log('- Password:', decrypted.password.replace(/./g, '*')); // Mask for display
  console.log('- API Key:', decrypted.apiKey);
  
  // Verify decryption was successful
  const success = decrypted.username === credentials.username && 
                 decrypted.password === credentials.password &&
                 decrypted.apiKey === credentials.apiKey;
                 
  console.log(`\nVerification result: ${success ? 'SUCCEEDED' : 'FAILED'}`);
  
  console.log('\n=== Test Completed ===');
  return success;
}

// Run test
runSimpleTest()
  .then(result => {
    if (!result) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });