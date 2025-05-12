/**
 * Encryption utilities for credential vault
 * Uses AES-256-GCM for secure encryption/decryption of credentials
 */
/**
 * Encrypts data using AES-256-GCM
 * @param data - Data object to encrypt
 * @returns Object containing encrypted data string and IV
 */
export declare function encryptData(data: Record<string, any>): {
    encryptedData: string;
    iv: string;
};
/**
 * Decrypts previously encrypted data
 * @param encryptedData - The encrypted data string
 * @param iv - The initialization vector used for encryption
 * @returns Decrypted data as an object
 */
export declare function decryptData(encryptedData: string, iv: string): Record<string, any>;
/**
 * Checks if encryption is properly configured
 * @returns true if ENCRYPTION_KEY is set to something other than the default
 */
export declare function isEncryptionConfigured(): boolean;
/**
 * Generates a test encryption/decryption to verify functionality
 */
export declare function testEncryption(): boolean;
