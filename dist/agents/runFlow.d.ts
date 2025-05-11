import { EnvVars } from '../types.js';
import config from '../../configs/platforms.json';
/**
 * Main function to execute a platform-specific flow
 * @param platform - The platform name to execute (e.g., "VinSolutions", "VAUTO")
 * @param envVars - Environment variables needed for the flow
 * @returns Path to the downloaded file
 */
export declare function runFlow(platform: keyof typeof config, envVars: EnvVars): Promise<string>;
