import { CRMReportOptions } from '../types.js';
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
export interface CRMReport {
    totalRecords: number;
    headers: string[];
    data: Record<string, string>[];
}
export declare function parseCRMReport(filePath: string): Promise<CRMReport>;
