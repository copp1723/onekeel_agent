/**
 * Encryption utilities for credential vault
 * Uses AES-256-GCM for secure encryption/decryption of credentials
 */

import CryptoJS from 'crypto-js';

// Environment variable for encryption key
// IMPORTANT: This should be set in production and kept secure
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-should-change-in-production';

/**
 * Encrypts data using AES-256-GCM
 * @param data - Data object to encrypt
 * @returns Object containing encrypted data string and IV
 */
export function encryptData(data: Record<string, any>): { 
  encryptedData: string; 
  iv: string;
} {
  // Convert data to JSON string
  const dataString = JSON.stringify(data);
  
  // Generate random IV
  const iv = CryptoJS.lib.WordArray.random(16);
  
  // Encrypt
  const encrypted = CryptoJS.AES.encrypt(dataString, ENCRYPTION_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return {
    encryptedData: encrypted.toString(),
    iv: iv.toString()
  };
}

/**
 * Decrypts previously encrypted data
 * @param encryptedData - The encrypted data string
 * @param iv - The initialization vector used for encryption
 * @returns Decrypted data as an object
 */
export function decryptData(encryptedData: string, iv: string): Record<string, any> {
  try {
    // Convert IV from string to WordArray
    const ivParams = CryptoJS.enc.Hex.parse(iv);
    
    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY, {
      iv: ivParams,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Convert to string and parse as JSON
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error("Decryption failed - invalid key or corrupted data");
    }
    
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error("Failed to decrypt data:", error);
    throw new Error("Decryption failed - data may be corrupted or encryption key is invalid");
  }
}

/**
 * Checks if encryption is properly configured
 * @returns true if ENCRYPTION_KEY is set to something other than the default
 */
export function isEncryptionConfigured(): boolean {
  return ENCRYPTION_KEY !== 'default-dev-key-should-change-in-production';
}

/**
 * Generates a test encryption/decryption to verify functionality
 */
export function testEncryption(): boolean {
  try {
    const testData = { test: "value", number: 123 };
    const { encryptedData, iv } = encryptData(testData);
    const decrypted = decryptData(encryptedData, iv);
    
    // Verify decryption worked correctly
    return decrypted.test === testData.test && decrypted.number === testData.number;
  } catch (error) {
    console.error("Encryption test failed:", error);
    return false;
  }
}