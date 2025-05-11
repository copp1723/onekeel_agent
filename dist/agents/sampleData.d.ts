/**
 * Sample Data Provider
 * Provides sample data for testing CRM report flows without real credentials
 */
/**
 * Returns a sample CSV report for the specified dealer ID
 * Used when USE_SAMPLE_DATA environment variable is set to 'true'
 * @param dealerId - Dealer ID to include in the sample data
 * @param platform - CRM platform (VinSolutions or VAUTO)
 * @returns Sample CSV data
 */
export declare function getSampleReport(dealerId: string, platform?: string): string;
/**
 * Creates a temporary CSV file with sample data
 * @param dealerId - Dealer ID to include in the sample data
 * @param platform - CRM platform (VinSolutions or VAUTO)
 * @returns Path to the temporary file
 */
export declare function createSampleReportFile(dealerId: string, platform?: string): Promise<string>;
