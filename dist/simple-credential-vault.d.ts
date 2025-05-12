/**
 * Simple Credential Vault Implementation for Eko AI Agent
 *
 * This is a simplified version of the credential vault that avoids some
 * of the more complex TypeScript issues in the main implementation.
 *
 * Features:
 * - AES-256-GCM encryption for credentials
 * - User isolation with Row-Level Security
 * - CRUD operations for credential management
 */
/**
 * Initialize encryption with a key
 * In production, this should be a securely stored environment variable
 */
export declare function initializeEncryption(key?: string): void;
/**
 * Check if encryption is properly configured
 */
export declare function isEncryptionConfigured(): boolean;
/**
 * Encrypt data with AES-256-GCM
 */
export declare function encryptData(data: any): {
    encryptedData: string;
    iv: string;
};
/**
 * Decrypt data with AES-256-GCM
 */
export declare function decryptData(encryptedData: string, iv: string): any;
/**
 * Test encryption/decryption
 */
export declare function testEncryption(): boolean;
/**
 * Credential data interface
 */
export interface CredentialData {
    username?: string;
    password?: string;
    apiKey?: string;
    apiSecret?: string;
    tokenType?: string;
    accessToken?: string;
    dealerId?: string;
    [key: string]: string | undefined;
}
/**
 * Add a new credential
 */
export declare function addCredential(userId: string, platform: string, data: CredentialData, options?: {
    label?: string | undefined;
    refreshToken?: string | undefined;
    refreshTokenExpiry?: Date | undefined;
}): Promise<any>;
/**
 * Get a credential by ID
 */
export declare function getCredentialById(id: string, userId: string): Promise<{
    credential: any;
    data: CredentialData;
}>;
/**
 * Get all credentials for a user
 */
export declare function getCredentials(userId: string, platformFilter?: string): Promise<Array<{
    credential: any;
    data: CredentialData;
}>>;
/**
 * Update a credential
 */
export declare function updateCredential(id: string, userId: string, data?: CredentialData, options?: {
    label?: string | undefined;
    refreshToken?: string | undefined;
    refreshTokenExpiry?: Date | undefined;
    active?: boolean | undefined;
}): Promise<any>;
/**
 * Soft delete a credential (mark as inactive)
 */
export declare function deleteCredential(id: string, userId: string): Promise<boolean>;
/**
 * Hard delete a credential (remove from database)
 */
export declare function hardDeleteCredential(id: string, userId: string): Promise<boolean>;
