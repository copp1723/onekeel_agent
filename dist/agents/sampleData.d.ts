/**
 * Sample Data Provider
 * Provides sample data for testing CRM report flows without real credentials
 */
import { CRMPlatform, PlatformConfig } from '../types.js';
/**
 * Returns a sample platform configuration for testing
 * Uses the same structure as the real platforms.json config
 * @param platform - CRM platform (VinSolutions or VAUTO)
 * @returns Sample platform configuration
 */
export declare function getSamplePlatformConfig(platform: CRMPlatform): PlatformConfig;
/**
 * Returns a sample CSV report for the specified dealer ID
 * Used when USE_SAMPLE_DATA environment variable is set to 'true'
 * @param dealerId - Dealer ID to include in the sample data
 * @param platform - CRM platform (VinSolutions or VAUTO)
 * @returns Sample CSV data
 */
export declare function getSampleReport(dealerId: string, platform?: CRMPlatform): string;
/**
 * Creates a temporary CSV file with sample data
 * @param dealerId - Dealer ID to include in the sample data
 * @param platform - CRM platform (VinSolutions or VAUTO)
 * @returns Path to the temporary file
 */
export declare function createSampleReportFile(dealerId: string, platform?: CRMPlatform): Promise<string>;
