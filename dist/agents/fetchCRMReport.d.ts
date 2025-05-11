interface CRMReportOptions {
    platform: string;
    dealerId: string;
    reportType?: string;
    dateRange?: string;
}
/**
 * Fetches a CRM report from the specified platform
 * @param options - Options for fetching the report
 * @returns Path to the downloaded report file
 */
export declare function fetchCRMReport(options: CRMReportOptions): Promise<string>;
/**
 * Parses a downloaded CRM report file
 * @param filePath - Path to the downloaded report file
 * @returns Parsed report data
 */
export declare function parseCRMReport(filePath: string): Promise<Record<string, any>>;
export {};
