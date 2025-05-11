/**
 * CredentialVault - Client-side module for credential management
 *
 * This module handles saving, retrieving, and listing user credentials
 * for sites that require authentication
 */
interface Credential {
    id: string;
    site: string;
    username: string;
    createdAt: string;
}
interface SaveCredentialParams {
    site: string;
    username: string;
    password: string;
}
export declare class CredentialVault {
    /**
     * Save a new credential or update an existing one
     * @param params The credential data to save
     * @returns Promise that resolves with the saved credential
     */
    static saveCredential(params: SaveCredentialParams): Promise<Credential>;
    /**
     * List all credentials for the current user
     * @returns Promise that resolves with an array of credentials
     */
    static listCredentials(): Promise<Credential[]>;
    /**
     * Delete a credential
     * @param credentialId The ID of the credential to delete
     * @returns Promise that resolves when the credential is deleted
     */
    static deleteCredential(credentialId: string): Promise<void>;
}
export {};
