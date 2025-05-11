import { EnvVars } from '../types.js';
/**
 * Logger interface for dependency injection and testing
 */
export interface Logger {
    info(message: string, ...meta: any[]): void;
    warn(message: string, ...meta: any[]): void;
    error(message: string, ...meta: any[]): void;
}
/**
 * Default console-based logger implementation
 */
export declare const consoleLogger: Logger;
/**
 * Orchestrates the hybrid ingestion process
 * First attempts email-based ingestion, then falls back to browser automation
 *
 * @param platform - The CRM platform (e.g., 'VinSolutions', 'VAUTO')
 * @param envVars - Environment variables needed for automation
 * @param logger - Optional logger for diagnostic information
 * @returns Path to the downloaded file
 */
export declare function hybridIngestAndRunFlow(platform: string, envVars: EnvVars, logger?: Logger): Promise<string>;
