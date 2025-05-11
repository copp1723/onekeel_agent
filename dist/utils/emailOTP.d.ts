/**
 * Email OTP retrieval utility
 * Connects to an email service to retrieve one-time passwords
 */
/**
 * Retrieves an OTP code from email
 * @param username - Email account username
 * @param password - Email account password
 * @returns Promise resolving to the OTP code or null if not found
 */
export declare function getEmailOTP(username: string, password: string): Promise<string | null>;
/**
 * Real email OTP implementation would use a library like 'imap' or 'node-imap'
 * Example implementation (commented out to avoid dependency issues):
 */
