import { EnvVars } from '../types.js';
declare const config: {
    VinSolutions: {
        baseUrl: string;
        hasOTP: boolean;
        selectors: {
            username: string;
            password: string;
            loginButton: string;
            otpInput: string;
            otpSubmit: string;
        };
        loginSteps: ({
            action: string;
            args: string[];
            selector?: never;
            value?: never;
        } | {
            action: string;
            selector: string;
            value: string;
            args?: never;
        } | {
            action: string;
            selector: string;
            args?: never;
            value?: never;
        })[];
        otpStep: {
            action: string;
            selector: string;
            clickAfter: string;
        };
        navigationSteps: {
            action: string;
            selector: string;
        }[];
        downloadSteps: {
            action: string;
            rowSelector: string;
            buttonSelector: string;
            saveAs: string;
        }[];
    };
    VAUTO: {
        baseUrl: string;
        hasOTP: boolean;
        selectors: {
            username: string;
            password: string;
            loginButton: string;
        };
        loginSteps: ({
            action: string;
            args: string[];
            selector?: never;
            value?: never;
        } | {
            action: string;
            selector: string;
            value: string;
            args?: never;
        } | {
            action: string;
            selector: string;
            args?: never;
            value?: never;
        })[];
        navigationSteps: {
            action: string;
            selector: string;
        }[];
        downloadSteps: {
            action: string;
            rowSelector: string;
            buttonSelector: string;
            saveAs: string;
        }[];
    };
};
/**
 * Main function to execute a platform-specific flow
 * @param platform - The platform name to execute (e.g., "VinSolutions", "VAUTO")
 * @param envVars - Environment variables needed for the flow
 * @returns Path to the downloaded file
 */
export declare function runFlow(platform: keyof typeof config, envVars: EnvVars): Promise<string>;
export {};
