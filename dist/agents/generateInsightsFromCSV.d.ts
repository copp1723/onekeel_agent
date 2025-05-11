/**
 * Generate Insights from CSV
 *
 * This module provides functionality to analyze automotive dealership data
 * and generate business insights using LLM-based analysis.
 */
export interface InsightResponse {
    title: string;
    description: string;
    actionItems: string[];
    dataPoints?: Record<string, any>;
}
/**
 * Generates insights from a CSV file using LLM-based analysis
 * @param csvFilePath - Path to the CSV file containing dealership data
 * @param intent - The analysis intent (e.g., 'automotive_analysis')
 * @returns Structured insights based on the data
 */
export declare function generateInsightsFromCSV(csvFilePath: string, intent?: string): Promise<InsightResponse>;
/**
 * Generates insights from raw CSV content using LLM-based analysis
 * @param csvContent - Raw CSV string content
 * @param intent - The analysis intent (e.g., 'automotive_analysis')
 * @returns Structured insights based on the data
 */
export declare function generateInsightsFromCSVContent(csvContent: string, intent?: string): Promise<InsightResponse>;
