/**
 * CredentialVault - Client-side module for credential management
 *
 * This module handles saving, retrieving, and listing user credentials
 * for sites that require authentication
 */
export class CredentialVault {
    /**
     * Save a new credential or update an existing one
     * @param params The credential data to save
     * @returns Promise that resolves with the saved credential
     */
    static async saveCredential(params) {
        try {
            const response = await fetch('/api/credentials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify(params)
            });
            if (!response.ok) {
                throw new Error(`Failed to save credential: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error saving credential:', error);
            throw error;
        }
    }
    /**
     * List all credentials for the current user
     * @returns Promise that resolves with an array of credentials
     */
    static async listCredentials() {
        try {
            const response = await fetch('/api/credentials', {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            });
            if (!response.ok) {
                throw new Error(`Failed to list credentials: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error listing credentials:', error);
            throw error;
        }
    }
    /**
     * Delete a credential
     * @param credentialId The ID of the credential to delete
     * @returns Promise that resolves when the credential is deleted
     */
    static async deleteCredential(credentialId) {
        try {
            const response = await fetch(`/api/credentials/${credentialId}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            if (!response.ok) {
                throw new Error(`Failed to delete credential: ${response.statusText}`);
            }
        }
        catch (error) {
            console.error('Error deleting credential:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=CredentialVault.js.map