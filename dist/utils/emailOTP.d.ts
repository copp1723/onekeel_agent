/**
 * Email OTP Retrieval
 *
 * This module handles retrieving One-Time Passwords (OTPs) from email accounts.
 * It connects to the specified email account, searches for OTP messages,
 * and extracts the codes using regular expressions.
 */
/**
 * Retrieve an OTP code from an email account
 * This function connects to an email account, searches for recent emails
 * containing OTP codes, and extracts the first code it finds.
 *
 * @param emailUser - Email username
 * @param emailPass - Email password
 * @param emailHost - IMAP server hostname
 * @param options - Additional options like port, timeouts, etc.
 * @returns The OTP code as a string, or null if none found
 */
export declare function getEmailOTP(emailUser: string, emailPass: string, emailHost: string, options?: {
    port?: number;
    tls?: boolean;
    searchCriteria?: any;
    minutesAgo?: number;
    regexPattern?: RegExp;
}): Promise<string | null>;
/**
 * Get OTP from email using environment variables
 * This is a convenience wrapper that uses environment variables
 * for email credentials.
 *
 * @param customAddress - Optional custom email address to use instead of EMAIL_USER
 * @returns The OTP code or null if not found
 */
export declare function getOTPFromEmail(customAddress?: string): Promise<string | null>;
