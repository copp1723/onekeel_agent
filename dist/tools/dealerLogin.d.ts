import { EkoTool } from './extractCleanContent.js';
export interface DealerLoginResult {
    success: boolean;
    message: string;
    dealerId: string;
    dealerName: string | undefined;
    token?: string;
    expiresAt?: string;
    error?: string;
    apiEndpoint?: string;
    sessionId?: string;
}
/**
 * Creates a dealerLogin tool that handles authentication with dealer websites
 * using stored credentials
 * @returns A tool object that can be registered with Eko
 */
export declare function dealerLogin(): EkoTool;
