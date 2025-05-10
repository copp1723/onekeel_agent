/**
 * Retrieves an API key from the Supabase database
 * @param keyName - The name of the API key to retrieve
 * @returns The API key value or null if not found
 */
export declare function getApiKey(keyName: string): Promise<string | null>;
/**
 * Retrieves dealer credentials from the Supabase database
 * @param dealerId - The unique identifier for the dealer
 * @returns The dealer credentials or null if not found
 */
export declare function getDealerCredentials(dealerId: string): Promise<{
    username: string;
    password: string;
    apiEndpoint?: string;
} | null>;
/**
 * Saves dealer credentials to the Supabase database
 * @param dealerId - The unique identifier for the dealer
 * @param credentials - The credentials to save
 * @returns Boolean indicating success or failure
 */
export declare function saveDealerCredentials(dealerId: string, credentials: {
    username: string;
    password: string;
    apiEndpoint?: string;
}): Promise<boolean>;
