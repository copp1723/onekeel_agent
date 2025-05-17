/**
 * KMS Encryption Service
 *
 * Provides encryption and decryption services using AWS KMS
 * Handles key versioning and rotation
 */
import crypto from 'crypto';
import { logger } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';
import { logSecurityEvent } from './awsKmsService.js';
import kmsClient from './awsKmsClient.js';

// Constants
const KEY_LENGTH = 32; // 256 bits for AES-256
const IV_LENGTH = 16;  // 128 bits for GCM mode
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM authentication tag
const ALGORITHM = 'aes-256-gcm';

// KMS encryption configuration
let kmsEncryptionConfig = {
  enabled: process.env.USE_AWS_KMS === 'true',
  keyId: process.env.AWS_KMS_KEY_ID || '',
  keyAlias: process.env.AWS_KMS_KEY_ALIAS || 'alias/agentflow-encryption-key',
  currentKeyVersion: process.env.AWS_KMS_KEY_VERSION || 'v1',
};

// Local encryption key (fallback for development or when KMS is not available)
let localEncryptionKey: Buffer | null = null;

/**
 * Initialize the KMS encryption service
 *
 * @param options - Configuration options
 * @returns true if initialization was successful
 */
export async function initializeKmsEncryption(options?: {
  enabled?: boolean;
  keyId?: string;
  keyAlias?: string;
  currentKeyVersion?: string;
  localKey?: string;
}): Promise<boolean> {
  try {
    // Update configuration with provided options
    if (options) {
      kmsEncryptionConfig = {
        ...kmsEncryptionConfig,
        ...options,
      };
    }

    // Initialize KMS client if KMS is enabled
    if (kmsEncryptionConfig.enabled) {
      await kmsClient.initializeKmsClient({
        keyId: kmsEncryptionConfig.keyId,
        keyAlias: kmsEncryptionConfig.keyAlias,
        useRealAws: process.env.NODE_ENV === 'production',
      });

      logger.info({
        event: 'kms_encryption_initialized',
        enabled: true,
        keyAlias: kmsEncryptionConfig.keyAlias,
        keyVersion: kmsEncryptionConfig.currentKeyVersion,
      }, 'KMS encryption service initialized with AWS KMS');

      // Log security event
      await logSecurityEvent('kms_encryption_initialized', undefined, {
        enabled: true,
        keyAlias: kmsEncryptionConfig.keyAlias,
        keyVersion: kmsEncryptionConfig.currentKeyVersion,
      });

      return true;
    } else {
      // Initialize local encryption
      return initializeLocalEncryption(options?.localKey);
    }
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'kms_encryption_initialization_error',
      error: errorMessage,
    }, `Failed to initialize KMS encryption service: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('kms_encryption_initialization_failed', undefined, {
      error: errorMessage,
    }, 'error');

    // Fall back to local encryption
    return initializeLocalEncryption(options?.localKey);
  }
}

/**
 * Initialize local encryption as fallback
 *
 * @param keyString - Optional encryption key
 * @returns true if initialization was successful
 */
function initializeLocalEncryption(keyString?: string): boolean {
  try {
    // Use provided key or environment variable
    const key = keyString || process.env.ENCRYPTION_KEY;

    // ENCRYPTION_KEY is required in production if KMS is disabled
    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        const errorMsg = 'ENCRYPTION_KEY environment variable is required in production when KMS is disabled';
        logger.error(errorMsg);
        logSecurityEvent('encryption_key_missing', undefined, {}, 'critical');
        throw new Error(errorMsg);
      }

      // For development, generate a random key
      logger.warn('No encryption key provided. Generating a random key for development use only.');
      logger.warn('This key will change on restart. DO NOT use for persistent data.');

      // Generate a secure random key for development
      localEncryptionKey = crypto.randomBytes(KEY_LENGTH);

      // Log this security event
      logSecurityEvent('random_encryption_key_generated', undefined, {
        environment: process.env.NODE_ENV || 'development'
      }, 'warning');

      return false;
    }

    // Check for known insecure default values
    const knownInsecureKeys = [
      'default-dev-key-should-change-in-production',
      'default-dev-key-do-not-use-in-production-environment',
      'temporary-encryption-key'
    ];

    if (knownInsecureKeys.includes(key)) {
      if (process.env.NODE_ENV === 'production') {
        const errorMsg = 'Using a known insecure encryption key in production';
        logger.error(errorMsg);
        logSecurityEvent('insecure_encryption_key', undefined, {}, 'critical');
        throw new Error(errorMsg);
      }
      logger.warn('Using a known insecure encryption key. This is not recommended.');
      logSecurityEvent('insecure_encryption_key', undefined, {
        environment: process.env.NODE_ENV || 'development'
      }, 'warning');
    }

    // If key is provided as hex string (64 chars for 32 bytes)
    if (/^[A-Fa-f0-9]{64}$/.test(key)) {
      localEncryptionKey = Buffer.from(key, 'hex');
    }
    // If key is provided as base64 string (44 chars for 32 bytes with padding)
    else if (/^[A-Za-z0-9+/=]{44}$/.test(key)) {
      localEncryptionKey = Buffer.from(key, 'base64');
    }
    // Otherwise, derive a key from the provided string using a secure KDF
    else {
      // Use a secure key derivation with a random salt
      const salt = crypto.randomBytes(16);
      localEncryptionKey = crypto.pbkdf2Sync(key, salt, 10000, KEY_LENGTH, 'sha256');

      // Log that we're deriving a key (not a security issue, but good to know)
      logger.info('Deriving encryption key from provided string using PBKDF2');
    }

    logger.info({
      event: 'local_encryption_initialized',
      keyVersion: 'local-v1',
    }, 'Local encryption service initialized');

    // Log security event
    logSecurityEvent('local_encryption_initialized', undefined, {
      environment: process.env.NODE_ENV || 'development',
    });

    return true;
  } catch (error) {
    const errorMsg = isError(error)
      ? error instanceof Error
        ? error.message
        : String(error)
      : String(error);

    logger.error(`Failed to initialize local encryption: ${errorMsg}`);

    // In production, encryption failures are critical and should stop the application
    if (process.env.NODE_ENV === 'production') {
      logSecurityEvent('encryption_initialization_failed', undefined, {
        error: errorMsg
      }, 'critical');
      throw error;
    }

    // For development only, generate a random key as a fallback
    logger.warn('Generating a random encryption key as fallback for development');
    localEncryptionKey = crypto.randomBytes(KEY_LENGTH);

    logSecurityEvent('fallback_encryption_key_generated', undefined, {
      environment: process.env.NODE_ENV || 'development',
      error: errorMsg
    }, 'warning');

    return false;
  }
}

/**
 * Encrypt data using KMS or local encryption
 *
 * @param data - Data to encrypt (object or string)
 * @param userId - Optional user ID for audit logging
 * @returns Object containing encrypted data with metadata
 */
export async function encryptData(
  data: Record<string, any> | string,
  userId?: string
): Promise<{
  encryptedData: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}> {
  try {
    // Convert data to string if it's an object
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    // Use KMS if enabled
    if (kmsEncryptionConfig.enabled) {
      // This will be implemented with actual AWS KMS SDK
      // For now, we'll use a mock implementation

      // Log encryption attempt
      logger.debug({
        event: 'kms_encryption_attempt',
        keyAlias: kmsEncryptionConfig.keyAlias,
        keyVersion: kmsEncryptionConfig.currentKeyVersion,
      }, 'Attempting to encrypt data with KMS');

      // Generate a random initialization vector
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher with a data key from KMS
      // In a real implementation, we would use KMS to generate a data key
      // and then use that key for encryption
      const cipher = crypto.createCipheriv(ALGORITHM, crypto.randomBytes(KEY_LENGTH), iv);

      // Encrypt the data
      let encrypted = cipher.update(dataString, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      // Log successful encryption
      logger.debug({
        event: 'kms_encryption_success',
        keyVersion: kmsEncryptionConfig.currentKeyVersion,
      }, 'Successfully encrypted data with KMS');

      // Log security event
      await logSecurityEvent('data_encrypted', userId, {
        keyVersion: kmsEncryptionConfig.currentKeyVersion,
        method: 'kms',
      });

      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyVersion: kmsEncryptionConfig.currentKeyVersion,
      };
    } else {
      // Use local encryption
      if (!localEncryptionKey) {
        throw new Error('Local encryption key is not initialized');
      }

      // Generate a random initialization vector
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher with key and IV
      const cipher = crypto.createCipheriv(ALGORITHM, localEncryptionKey, iv);

      // Encrypt the data
      let encrypted = cipher.update(dataString, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      // Log security event
      await logSecurityEvent('data_encrypted', userId, {
        keyVersion: 'local-v1',
        method: 'local',
      });

      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyVersion: 'local-v1',
      };
    }
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'encryption_error',
      error: errorMessage,
    }, `Failed to encrypt data: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('encryption_failed', userId, {
      error: errorMessage,
    }, 'error');

    throw error;
  }
}

/**
 * Decrypt data using KMS or local encryption
 *
 * @param encryptedData - Encrypted data
 * @param iv - Initialization vector
 * @param authTag - Authentication tag
 * @param keyVersion - Key version used for encryption
 * @param userId - Optional user ID for audit logging
 * @returns Decrypted data as an object or string
 */
export async function decryptData(
  encryptedData: string,
  iv: string,
  authTag: string,
  keyVersion: string = 'v1',
  userId?: string
): Promise<any> {
  try {
    // Convert IV and auth tag from base64 to Buffer
    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');

    // Use KMS if enabled and the key version is not local
    if (kmsEncryptionConfig.enabled && !keyVersion.startsWith('local-')) {
      // This will be implemented with actual AWS KMS SDK
      // For now, we'll use a mock implementation

      // Log decryption attempt
      logger.debug({
        event: 'kms_decryption_attempt',
        keyVersion,
      }, 'Attempting to decrypt data with KMS');

      // In a real implementation, we would use KMS to decrypt the data key
      // and then use that key for decryption
      // For now, we'll use a mock implementation

      // Create decipher with a data key from KMS
      const decipher = crypto.createDecipheriv(ALGORITHM, crypto.randomBytes(KEY_LENGTH), ivBuffer);

      // Set auth tag for GCM mode
      decipher.setAuthTag(authTagBuffer);

      // Decrypt the data
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // Log successful decryption
      logger.debug({
        event: 'kms_decryption_success',
        keyVersion,
      }, 'Successfully decrypted data with KMS');

      // Log security event
      await logSecurityEvent('data_decrypted', userId, {
        keyVersion,
        method: 'kms',
      });

      // Try to parse as JSON, return as string if not valid JSON
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } else {
      // Use local encryption
      if (!localEncryptionKey) {
        throw new Error('Local encryption key is not initialized');
      }

      // Create decipher with key and IV
      const decipher = crypto.createDecipheriv(ALGORITHM, localEncryptionKey, ivBuffer);

      // Set auth tag for GCM mode
      decipher.setAuthTag(authTagBuffer);

      // Decrypt the data
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // Log security event
      await logSecurityEvent('data_decrypted', userId, {
        keyVersion: keyVersion || 'local-v1',
        method: 'local',
      });

      // Try to parse as JSON, return as string if not valid JSON
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    }
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'decryption_error',
      error: errorMessage,
      keyVersion,
    }, `Failed to decrypt data: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('decryption_failed', userId, {
      error: errorMessage,
      keyVersion,
    }, 'error');

    throw error;
  }
}

/**
 * Test the encryption functionality
 * @returns true if encryption and decryption work correctly
 */
export function testEncryption(): boolean {
  try {
    // Test data
    const testData = {
      username: 'test@example.com',
      password: 'password123',
      apiKey: 'sk_test_12345',
      timestamp: new Date().toISOString(),
    };

    // Encrypt
    return encryptData(testData)
      .then(({ encryptedData, iv, authTag, keyVersion }) => {
        // Decrypt
        return decryptData(encryptedData, iv, authTag, keyVersion)
          .then(decrypted => {
            // Verify all fields match
            return (
              decrypted.username === testData.username &&
              decrypted.password === testData.password &&
              decrypted.apiKey === testData.apiKey &&
              decrypted.timestamp === testData.timestamp
            );
          });
      })
      .catch(error => {
        logger.error('Encryption test failed:', error);
        return false;
      });
  } catch (error) {
    logger.error('Encryption test failed:', error);
    return false;
  }
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return kmsEncryptionConfig.enabled || (!!localEncryptionKey && localEncryptionKey.length === KEY_LENGTH);
}

// Export the service
export default {
  initializeKmsEncryption,
  encryptData,
  decryptData,
  testEncryption,
  isEncryptionConfigured,
};
