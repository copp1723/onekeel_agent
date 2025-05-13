interface EmailConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
}
export declare function sendOTP(email: string, config: EmailConfig): Promise<string>;
export declare function verifyOTP(inputOTP: string, hashedOTPWithExpiry: string): boolean;
export declare function checkEmailForOTP(config: EmailConfig, searchCriteria?: any): Promise<string | null>;
export {};
