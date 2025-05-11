/**
 * Fetch and Analyze CRM Report
 *
 * This module combines the report fetching functionality with
 * the insight generation to provide a complete end-to-end flow.
 */
import { InsightResponse } from './generateInsightsFromCSV.js';
import { CRMReportOptions } from '../types.js';
/**
 * Combined result including both the report data and generated insights
 */
export interface CRMAnalysisResult {
    reportData: {
        filePath: string;
        totalRecords: number;
        headers: string[];
    };
    insights: InsightResponse;
}
/**
 * Fetches a CRM report and generates insights from the data
 * @param options - Options for fetching the report
 * @param intent - The analysis intent (default: 'automotive_analysis')
 * @returns Combined results with report data and insights
 */
export declare function fetchAndAnalyzeCRMReport(options: CRMReportOptions, intent?: string): Promise<CRMAnalysisResult>;
