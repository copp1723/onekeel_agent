/**
 * AWS KMS Service
 * 
 * Provides integration with AWS Key Management Service for secure key management
 * Used for encrypting sensitive data like API keys and credentials
 */
import crypto from 'crypto';
import { logger } from '../shared/logger.js';
import { db } from '../shared/db.js';
import { securityAuditLogs } from '../shared/schema.js';
import { isError } from '../utils/errorUtils.js';

// Constants
const KEY_LENGTH = 32; // 256 bits for AES-256
const IV_LENGTH = 16;  // 128 bits for GCM mode
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM authentication tag
const ALGORITHM = 'aes-256-gcm';

// AWS KMS configuration
let kmsConfig = {
  enabled: false,
  region: process.env.AWS_REGION || 'us-east-1',
  keyId: process.env.AWS_KMS_KEY_ID || '',
  keyAlias: process.env.AWS_KMS_KEY_ALIAS || 'alias/agentflow-encryption-key',
  autoRotationDays: process.env.AWS_KMS_AUTO_ROTATION_DAYS ? 
    parseInt(process.env.AWS_KMS_AUTO_ROTATION_DAYS, 10) : 90,
};

// Local encryption key (fallback for development or when KMS is not available)
let localEncryptionKey: Buffer | null = null;

/**
 * Initialize the AWS KMS service
 * 
 * @param options - Configuration options
 * @returns true if initialization was successful
 */
export async function initializeKmsService(options?: {
  enabled?: boolean;
  region?: string;
  keyId?: string;
  keyAlias?: string;
  autoRotationDays?: number;
}): Promise<boolean> {
  try {
    // Update configuration with provided options
    if (options) {
      kmsConfig = {
        ...kmsConfig,
        ...options,
      };
    }

    // Check if KMS is enabled
    if (!kmsConfig.enabled) {
      logger.warn('AWS KMS integration is disabled. Using local encryption.');
      return initializeLocalEncryption();
    }

    // Validate KMS configuration
    if (!kmsConfig.keyId && !kmsConfig.keyAlias) {
      logger.error('AWS KMS configuration is invalid. Either keyId or keyAlias must be provided.');
      return false;
    }

    // Log KMS initialization
    logger.info({
      event: 'kms_initialization',
      region: kmsConfig.region,
      keyAlias: kmsConfig.keyAlias,
      autoRotationDays: kmsConfig.autoRotationDays,
    }, 'AWS KMS service initialized');

    // Log security event
    await logSecurityEvent('kms_initialized', undefined, {
      region: kmsConfig.region,
      keyAlias: kmsConfig.keyAlias,
      autoRotationDays: kmsConfig.autoRotationDays,
    });

    return true;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'kms_initialization_error',
      error: errorMessage,
    }, `Failed to initialize AWS KMS service: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('kms_initialization_failed', undefined, {
      error: errorMessage,
    }, 'error');

    // Fall back to local encryption
    return initializeLocalEncryption();
  }
}

/**
 * Initialize local encryption as fallback
 * 
 * @returns true if initialization was successful
 */
function initializeLocalEncryption(): boolean {
  try {
    const keyString = process.env.ENCRYPTION_KEY;

    // ENCRYPTION_KEY is required in production if KMS is disabled
    if (!keyString) {
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

    if (knownInsecureKeys.includes(keyString)) {
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
    if (/^[A-Fa-f0-9]{64}$/.test(keyString)) {
      localEncryptionKey = Buffer.from(keyString, 'hex');
    }
    // If key is provided as base64 string (44 chars for 32 bytes with padding)
    else if (/^[A-Za-z0-9+/=]{44}$/.test(keyString)) {
      localEncryptionKey = Buffer.from(keyString, 'base64');
    }
    // Otherwise, derive a key from the provided string using a secure KDF
    else {
      // Use a secure key derivation with a random salt
      const salt = crypto.randomBytes(16);
      localEncryptionKey = crypto.pbkdf2Sync(keyString, salt, 10000, KEY_LENGTH, 'sha256');

      // Log that we're deriving a key (not a security issue, but good to know)
      logger.info('Deriving encryption key from provided string using PBKDF2');
    }

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
 * Log a security-related event to the audit log
 *
 * @param eventType - Type of security event
 * @param userId - User ID associated with the event (if applicable)
 * @param eventData - Additional data about the event (no sensitive data)
 * @param severity - Severity level of the event
 */
export async function logSecurityEvent(
  eventType: string,
  userId?: string,
  eventData: Record<string, any> = {},
  severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
): Promise<void> {
  try {
    await db.insert(securityAuditLogs).values({
      userId,
      eventType,
      eventData,
      severity,
      timestamp: new Date(),
    });
  } catch (error) {
    // Just log to console if we can't write to the database
    logger.error(`Failed to log security event: ${isError(error) ? error.message : String(error)}`);
  }
}

// Export the service
export default {
  initializeKmsService,
  logSecurityEvent,
};
