/**
 * Credential Vault Service
 * Securely stores and manages user credentials with encryption
 */
import { eq, and } from 'drizzle-orm';
import { db } from '../shared/db.js';
import { credentials } from '../shared/schema.js';
import { encryptData, decryptData, isEncryptionConfigured } from '../utils/encryption.js';
/**
 * Add a new credential to the vault
 * @param userId - User ID who owns this credential
 * @param platform - Platform name (e.g., 'VinSolutions', 'VAUTO')
 * @param data - Credential data to encrypt and store
 * @param options - Additional options like label and refresh token
 * @returns Created credential (with encrypted data)
 */
export async function addCredential(userId, platform, data, options) {
    // Verify encryption is configured properly
    if (!isEncryptionConfigured()) {
        console.warn('Warning: Using default encryption key. Set ENCRYPTION_KEY in production.');
    }
    // Encrypt the credential data
    const { encryptedData, iv } = encryptData(data);
    // Create credential record
    const credential = {
        userId,
        platform,
        label: options?.label || platform,
        encryptedData,
        iv,
        refreshToken: options?.refreshToken,
        refreshTokenExpiry: options?.refreshTokenExpiry,
        active: true,
    };
    // Insert into database
    const [createdCredential] = await db.insert(credentials)
        .values(credential)
        .returning();
    return createdCredential;
}
/**
 * Get credential by ID
 * @param id - Credential UUID
 * @param userId - User ID for security verification
 * @returns Credential with decrypted data
 */
export async function getCredentialById(id, userId) {
    // Query with user ID for security
    const [credential] = await db.select()
        .from(credentials)
        .where(and(eq(credentials.id, id), eq(credentials.userId, userId)));
    if (!credential) {
        throw new Error('Credential not found or access denied');
    }
    // Decrypt the data
    const data = decryptData(credential.encryptedData, credential.iv);
    return {
        credential,
        data
    };
}
/**
 * Get credentials for a user and platform
 * @param userId - User ID
 * @param platform - Platform name (optional)
 * @returns Array of credentials with decrypted data
 */
export async function getCredentials(userId, platform) {
    // Build query conditions
    const conditions = [
        eq(credentials.userId, userId),
        eq(credentials.active, true)
    ];
    if (platform) {
        conditions.push(eq(credentials.platform, platform));
    }
    // Query active credentials
    const results = await db.select()
        .from(credentials)
        .where(and(...conditions));
    // Decrypt all credential data
    return results.map(credential => ({
        credential,
        data: decryptData(credential.encryptedData, credential.iv)
    }));
}
/**
 * Update credential data
 * @param id - Credential ID to update
 * @param userId - User ID for security verification
 * @param data - New credential data
 * @param options - Additional options to update
 * @returns Updated credential
 */
export async function updateCredential(id, userId, data, options) {
    // First verify the credential exists and belongs to this user
    const [existingCredential] = await db.select()
        .from(credentials)
        .where(and(eq(credentials.id, id), eq(credentials.userId, userId)));
    if (!existingCredential) {
        throw new Error('Credential not found or access denied');
    }
    // Build update object
    const updates = {
        updatedAt: new Date()
    };
    // If data is provided, encrypt it
    if (data) {
        const { encryptedData, iv } = encryptData(data);
        updates.encryptedData = encryptedData;
        updates.iv = iv;
    }
    // Apply other updates if provided
    if (options?.label)
        updates.label = options.label;
    if (options?.refreshToken)
        updates.refreshToken = options.refreshToken;
    if (options?.refreshTokenExpiry)
        updates.refreshTokenExpiry = options.refreshTokenExpiry;
    if (options?.active !== undefined)
        updates.active = options.active;
    // Update in database
    const [updatedCredential] = await db.update(credentials)
        .set(updates)
        .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
        .returning();
    return updatedCredential;
}
/**
 * Delete credential (soft delete by setting active=false)
 * @param id - Credential ID to delete
 * @param userId - User ID for security verification
 * @returns Success flag
 */
export async function deleteCredential(id, userId) {
    // Mark as inactive rather than deleting
    const [updated] = await db.update(credentials)
        .set({
        active: false,
        updatedAt: new Date()
    })
        .where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
        .returning();
    return !!updated;
}
/**
 * Hard delete a credential (for admin use or compliance)
 * @param id - Credential ID
 * @param userId - User ID for security verification
 * @returns Success flag
 */
export async function hardDeleteCredential(id, userId) {
    try {
        const result = await db.delete(credentials)
            .where(and(eq(credentials.id, id), eq(credentials.userId, userId)));
        // Drizzle doesn't provide rowCount directly, so use a different approach
        return true; // If no error was thrown, assume success
    }
    catch (error) {
        console.error('Error hard deleting credential:', error);
        return false;
    }
}
/**
 * Refresh an OAuth token if it's expired
 * @param id - Credential ID
 * @param userId - User ID
 * @returns Updated credential with new access token
 */
export async function refreshOAuthToken(id, userId) {
    // Get the credential first
    const { credential, data } = await getCredentialById(id, userId);
    // Check if we have a refresh token and if it's expired
    if (!credential.refreshToken) {
        throw new Error('No refresh token available');
    }
    const now = new Date();
    if (credential.refreshTokenExpiry && credential.refreshTokenExpiry > now) {
        // Not expired yet, return current data
        return { credential, data };
    }
    try {
        // Implement token refresh logic here - will vary by platform
        // For now, just a placeholder
        console.log('Refreshing token for platform:', credential.platform);
        // Update with new tokens (mock implementation)
        const updatedData = { ...data };
        updatedData.accessToken = `refreshed_token_${Date.now()}`;
        // Update in database with 1 hour expiry
        const refreshExpiry = new Date();
        refreshExpiry.setHours(refreshExpiry.getHours() + 1);
        const updatedCredential = await updateCredential(id, userId, updatedData, {
            refreshTokenExpiry: refreshExpiry
        });
        return {
            credential: updatedCredential,
            data: updatedData
        };
    }
    catch (error) {
        console.error('Failed to refresh token:', error);
        // Handle different error types safely
        const errorMessage = error instanceof Error
            ? error.message
            : 'Unknown error during token refresh';
        throw new Error(`Token refresh failed: ${errorMessage}`);
    }
}
//# sourceMappingURL=credentialVault.js.map