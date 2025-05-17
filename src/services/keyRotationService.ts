/**
 * Key Rotation Service
 * 
 * Handles automatic rotation of encryption keys
 * Manages key versioning and scheduled rotation
 */
import { logger } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';
import { logSecurityEvent } from './awsKmsService.js';
import kmsClient from './awsKmsClient.js';
import { db } from '../shared/db.js';
import { apiKeys } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import cron from 'node-cron';

// Key rotation configuration
let keyRotationConfig = {
  enabled: process.env.KEY_ROTATION_ENABLED === 'true',
  schedule: process.env.KEY_ROTATION_SCHEDULE || '0 0 1 * *', // Monthly by default (1st day of month at midnight)
  autoRotationDays: process.env.KEY_ROTATION_DAYS ? 
    parseInt(process.env.KEY_ROTATION_DAYS, 10) : 90, // 90 days by default
  notifyBeforeDays: process.env.KEY_ROTATION_NOTIFY_BEFORE_DAYS ? 
    parseInt(process.env.KEY_ROTATION_NOTIFY_BEFORE_DAYS, 10) : 7, // 7 days before expiry
};

// Scheduled job reference
let scheduledJob: cron.ScheduledTask | null = null;

/**
 * Initialize the key rotation service
 * 
 * @param options - Configuration options
 * @returns true if initialization was successful
 */
export async function initializeKeyRotation(options?: {
  enabled?: boolean;
  schedule?: string;
  autoRotationDays?: number;
  notifyBeforeDays?: number;
}): Promise<boolean> {
  try {
    // Update configuration with provided options
    if (options) {
      keyRotationConfig = {
        ...keyRotationConfig,
        ...options,
      };
    }

    // Check if key rotation is enabled
    if (!keyRotationConfig.enabled) {
      logger.info('Key rotation is disabled');
      return true;
    }

    // Validate cron schedule
    if (!cron.validate(keyRotationConfig.schedule)) {
      logger.error(`Invalid cron schedule: ${keyRotationConfig.schedule}`);
      return false;
    }

    // Schedule key rotation job
    scheduledJob = cron.schedule(keyRotationConfig.schedule, async () => {
      try {
        await rotateKeys();
      } catch (error) {
        const errorMessage = isError(error) ? error.message : String(error);
        logger.error({
          event: 'key_rotation_error',
          error: errorMessage,
        }, `Scheduled key rotation failed: ${errorMessage}`);

        // Log security event
        await logSecurityEvent('scheduled_key_rotation_failed', undefined, {
          error: errorMessage,
        }, 'error');
      }
    });

    // Log initialization
    logger.info({
      event: 'key_rotation_initialized',
      enabled: keyRotationConfig.enabled,
      schedule: keyRotationConfig.schedule,
      autoRotationDays: keyRotationConfig.autoRotationDays,
    }, 'Key rotation service initialized');

    // Log security event
    await logSecurityEvent('key_rotation_initialized', undefined, {
      enabled: keyRotationConfig.enabled,
      schedule: keyRotationConfig.schedule,
      autoRotationDays: keyRotationConfig.autoRotationDays,
    });

    return true;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'key_rotation_initialization_error',
      error: errorMessage,
    }, `Failed to initialize key rotation service: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('key_rotation_initialization_failed', undefined, {
      error: errorMessage,
    }, 'error');

    return false;
  }
}

/**
 * Rotate encryption keys
 * 
 * @param force - Force rotation even if not scheduled
 * @returns true if rotation was successful
 */
export async function rotateKeys(force: boolean = false): Promise<boolean> {
  try {
    // Log rotation start
    logger.info({
      event: 'key_rotation_started',
      forced: force,
    }, 'Starting key rotation process');

    // Create a new KMS key
    const { keyId, keyArn } = await kmsClient.createKey(
      'AgentFlow encryption key (auto-rotated)',
      {
        'CreatedBy': 'KeyRotationService',
        'RotationDate': new Date().toISOString(),
      }
    );

    // Create an alias for the new key
    await kmsClient.createAlias(keyId, 'agentflow-encryption-key');

    // Enable automatic key rotation for the new key
    await kmsClient.enableKeyRotation(keyId);

    // Log rotation success
    logger.info({
      event: 'key_rotation_completed',
      keyId,
      forced: force,
    }, `Key rotation completed successfully. New key ID: ${keyId}`);

    // Log security event
    await logSecurityEvent('key_rotation_completed', undefined, {
      keyId,
      forced: force,
    });

    return true;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'key_rotation_error',
      error: errorMessage,
      forced: force,
    }, `Key rotation failed: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('key_rotation_failed', undefined, {
      error: errorMessage,
      forced: force,
    }, 'error');

    return false;
  }
}

/**
 * Check for keys that need rotation
 * 
 * @returns Array of keys that need rotation
 */
export async function checkKeysForRotation(): Promise<any[]> {
  try {
    // Calculate the rotation threshold date
    const rotationThreshold = new Date();
    rotationThreshold.setDate(rotationThreshold.getDate() - keyRotationConfig.autoRotationDays);

    // Calculate the notification threshold date
    const notificationThreshold = new Date();
    notificationThreshold.setDate(
      notificationThreshold.getDate() - (keyRotationConfig.autoRotationDays - keyRotationConfig.notifyBeforeDays)
    );

    // Get all API keys that need rotation
    const keysNeedingRotation = await db
      .select()
      .from(apiKeys)
      .where(
        eq(apiKeys.active, true)
      );

    // Filter keys based on creation date
    const keysToRotate = keysNeedingRotation.filter(key => {
      const createdAt = new Date(key.createdAt!);
      return createdAt < rotationThreshold;
    });

    // Filter keys that are approaching rotation
    const keysApproachingRotation = keysNeedingRotation.filter(key => {
      const createdAt = new Date(key.createdAt!);
      return createdAt < notificationThreshold && createdAt >= rotationThreshold;
    });

    // Log keys that need rotation
    if (keysToRotate.length > 0) {
      logger.info({
        event: 'keys_need_rotation',
        count: keysToRotate.length,
      }, `Found ${keysToRotate.length} keys that need rotation`);

      // Log security event
      await logSecurityEvent('keys_need_rotation', undefined, {
        count: keysToRotate.length,
      });
    }

    // Log keys approaching rotation
    if (keysApproachingRotation.length > 0) {
      logger.info({
        event: 'keys_approaching_rotation',
        count: keysApproachingRotation.length,
      }, `Found ${keysApproachingRotation.length} keys approaching rotation threshold`);

      // Log security event
      await logSecurityEvent('keys_approaching_rotation', undefined, {
        count: keysApproachingRotation.length,
      }, 'warning');
    }

    return keysToRotate;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'check_keys_rotation_error',
      error: errorMessage,
    }, `Failed to check keys for rotation: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('check_keys_rotation_failed', undefined, {
      error: errorMessage,
    }, 'error');

    return [];
  }
}

/**
 * Stop the key rotation service
 */
export function stopKeyRotation(): void {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    logger.info('Key rotation service stopped');
  }
}

// Export the service
export default {
  initializeKeyRotation,
  rotateKeys,
  checkKeysForRotation,
  stopKeyRotation,
};
