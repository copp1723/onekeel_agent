/**
 * Fetch and Analyze CRM Report
 * 
 * This module combines the report fetching functionality with
 * the insight generation to provide a complete end-to-end flow.
 */

import { fetchCRMReport, parseCRMReport } from './fetchCRMReport.js';
import { generateInsightsFromCSV, InsightResponse } from './generateInsightsFromCSV.js';
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
export async function fetchAndAnalyzeCRMReport(
  options: CRMReportOptions,
  intent: string = 'automotive_analysis'
): Promise<CRMAnalysisResult> {
  console.log(`Starting CRM report fetch and analysis for ${options.platform!}...`);
  
  try {
    // Step 1: Fetch the report using the hybrid ingestion approach
    const startFetchTime = Date.now();
    const filePath = await fetchCRMReport(options);
    const fetchDuration = ((Date.now() - startFetchTime) / 1000).toFixed(2);
    console.log(`✅ Report fetched in ${fetchDuration}s. File path: ${filePath}`);
    
    // Step 2: Parse the report to get basic information
    const reportData = await parseCRMReport(filePath);
    console.log(`📊 Report parsed: ${reportData.totalRecords} records found`);
    
    // Step 3: Generate insights from the report
    const startAnalysisTime = Date.now();
    console.log(`🧠 Generating insights with intent: ${intent}...`);
    const insights = await generateInsightsFromCSV(filePath, intent);
    const analysisDuration = ((Date.now() - startAnalysisTime) / 1000).toFixed(2);
    console.log(`✅ Insights generated in ${analysisDuration}s`);
    
    // Step 4: Return the combined results
    return {
      reportData: {
        filePath,
        totalRecords: reportData.totalRecords,
        headers: reportData.headers,
      },
      insights
    };
    
  } catch (error) {
    console.error('Error in fetchAndAnalyzeCRMReport:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch and analyze CRM report: ${error.message}`);
    } else {
      throw new Error(`Failed to fetch and analyze CRM report: Unknown error`);
    }
  }
}