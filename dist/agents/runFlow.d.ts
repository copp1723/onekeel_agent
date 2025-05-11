import { CRMPlatform, EnvVars } from '../types.js';
/**
 * Main function to execute a platform-specific flow
 * @param platform - The platform name to execute (e.g., "VinSolutions", "VAUTO")
 * @param envVars - Environment variables needed for the flow
 * @returns Path to the downloaded file
 */
export declare function runFlow(platform: CRMPlatform, envVars: EnvVars): Promise<string>;
