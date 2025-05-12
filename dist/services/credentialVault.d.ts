/**
 * Credential Vault Service
 * Securely stores and manages user credentials with encryption
 */
import { type CredentialData, type Credential } from '../shared/schema.js';
/**
 * Add a new credential to the vault
 * @param userId - User ID who owns this credential
 * @param platform - Platform name (e.g., 'VinSolutions', 'VAUTO')
 * @param data - Credential data to encrypt and store
 * @param options - Additional options like label and refresh token
 * @returns Created credential (with encrypted data)
 */
export declare function addCredential(userId: string, platform: string, data: CredentialData, options?: {
    label?: string | undefined;
    refreshToken?: string | undefined;
    refreshTokenExpiry?: Date | undefined;
}): Promise<Credential>;
/**
 * Get credential by ID
 * @param id - Credential UUID
 * @param userId - User ID for security verification
 * @returns Credential with decrypted data
 */
export declare function getCredentialById(id: string, userId: string): Promise<{
    credential: Credential;
    data: CredentialData;
}>;
/**
 * Get credentials for a user and platform
 * @param userId - User ID
 * @param platform - Platform name (optional)
 * @returns Array of credentials with decrypted data
 */
export declare function getCredentials(userId: string, platform?: string): Promise<Array<{
    credential: Credential;
    data: CredentialData;
}>>;
/**
 * Update credential data
 * @param id - Credential ID to update
 * @param userId - User ID for security verification
 * @param data - New credential data
 * @param options - Additional options to update
 * @returns Updated credential
 */
export declare function updateCredential(id: string, userId: string, data?: CredentialData, options?: {
    label?: string | undefined;
    refreshToken?: string | undefined;
    refreshTokenExpiry?: Date | undefined;
    active?: boolean | undefined;
}): Promise<Credential>;
/**
 * Delete credential (soft delete by setting active=false)
 * @param id - Credential ID to delete
 * @param userId - User ID for security verification
 * @returns Success flag
 */
export declare function deleteCredential(id: string, userId: string): Promise<boolean>;
/**
 * Hard delete a credential (for admin use or compliance)
 * @param id - Credential ID
 * @param userId - User ID for security verification
 * @returns Success flag
 */
export declare function hardDeleteCredential(id: string, userId: string): Promise<boolean>;
/**
 * Refresh an OAuth token if it's expired
 * @param id - Credential ID
 * @param userId - User ID
 * @returns Updated credential with new access token
 */
export declare function refreshOAuthToken(id: string, userId: string): Promise<{
    credential: Credential;
    data: CredentialData;
}>;
