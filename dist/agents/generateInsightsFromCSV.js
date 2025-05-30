/**
 * Generate Insights from CSV
 *
 * This module provides functionality to analyze automotive dealership data
 * and generate business insights using LLM-based analysis.
 */
import OpenAI from 'openai';
import * as fs from 'fs';
import path from 'path';
import { getPromptByIntent } from '../prompts/promptRouter.js';
import { logInsightRun } from '../shared/logger.js';
import { saveResult } from '../shared/outputStorage.js';
/**
 * Generates insights from a CSV file using LLM-based analysis
 * @param csvFilePath - Path to the CSV file containing dealership data
 * @param intent - The analysis intent (e.g., 'automotive_analysis')
 * @returns Structured insights based on the data
 */
export async function generateInsightsFromCSV(csvFilePath, intent = 'automotive_analysis') {
    // Validate file exists
    if (!fs.existsSync(csvFilePath)) {
        throw new Error(`CSV file not found: ${csvFilePath}`);
    }
    // Extract platform from file path
    const filename = path.basename(csvFilePath);
    const platform = filename.includes('VinSolutions') ? 'VinSolutions' :
        filename.includes('VAUTO') ? 'VAUTO' : 'Unknown';
    // Timing data
    const startTime = Date.now();
    // Read CSV file content
    const csvContent = await fs.promises.readFile(csvFilePath, 'utf-8');
    try {
        // Get appropriate system prompt based on intent
        const promptInfo = getPromptByIntent(intent);
        // Initialize OpenAI client
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // Prepare sample size for analysis (limit to prevent token overflow)
        const lines = csvContent.split('\n');
        const headers = lines[0];
        const sampleSize = Math.min(lines.length, 200); // Limit to 200 rows
        const sampleData = [headers, ...lines.slice(1, sampleSize)].join('\n');
        // Generate insight using OpenAI
        console.log(`Generating insights with intent: ${intent}`);
        console.log(`Using prompt version: ${promptInfo.version}`);
        console.log(`Using sample of ${sampleSize} rows from CSV`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
                { role: 'system', content: promptInfo.text },
                {
                    role: 'user',
                    content: `Here is a validated CRM export from an automotive dealership. Please analyze this data and provide insights:\n\n${sampleData}`
                }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
        });
        // Calculate duration
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        // Parse the response
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Failed to generate insights: Empty response from OpenAI');
        }
        // Parse JSON response
        const insightData = JSON.parse(content);
        // Validate response structure
        if (!insightData.title || !insightData.description || !Array.isArray(insightData.actionItems)) {
            throw new Error('Invalid insight format: Missing required fields');
        }
        // Log the insight run
        const insightRunData = {
            platform,
            inputFile: csvFilePath,
            promptIntent: intent,
            promptVersion: promptInfo.version,
            durationMs,
            outputSummary: [insightData.title]
        };
        logInsightRun(insightRunData);
        // Save result to structured directory
        const outputFilename = `insight_${Date.now()}`;
        const outputPath = saveResult(platform, insightData, outputFilename, {
            promptIntent: intent,
            promptVersion: promptInfo.version,
            durationMs,
            inputFile: csvFilePath,
            sampleSize
        });
        console.log(`Insight saved to: ${outputPath}`);
        return insightData;
    }
    catch (error) {
        // Calculate duration on error
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        // Prepare error message
        let errorMessage;
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        else {
            errorMessage = 'Unknown error';
        }
        // Log insight run with error
        const insightRunData = {
            platform,
            inputFile: csvFilePath,
            promptIntent: intent,
            promptVersion: 'error',
            durationMs,
            outputSummary: [],
            error: errorMessage
        };
        logInsightRun(insightRunData);
        console.error('Error generating insights:', error);
        // Save error details to results directory
        const errorFilename = `insight_error_${Date.now()}`;
        saveResult(platform, { error: errorMessage }, errorFilename, {
            promptIntent: intent,
            inputFile: csvFilePath,
            durationMs,
            status: 'error'
        });
        // Re-throw with meaningful message
        if (error instanceof Error) {
            throw new Error(`Failed to generate insights: ${error.message}`);
        }
        else {
            throw new Error(`Failed to generate insights: Unknown error`);
        }
    }
}
/**
 * Generates insights from raw CSV content using LLM-based analysis
 * @param csvContent - Raw CSV string content
 * @param intent - The analysis intent (e.g., 'automotive_analysis')
 * @returns Structured insights based on the data
 */
export async function generateInsightsFromCSVContent(csvContent, intent = 'automotive_analysis') {
    // Identify platform from content if possible
    const platform = csvContent.includes('VinSolutions') ? 'VinSolutions' :
        csvContent.includes('VAUTO') ? 'VAUTO' : 'Unknown';
    // Timing data
    const startTime = Date.now();
    try {
        // Get appropriate system prompt based on intent
        const promptInfo = getPromptByIntent(intent);
        // Initialize OpenAI client
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // Prepare sample size for analysis (limit to prevent token overflow)
        const lines = csvContent.split('\n');
        const headers = lines[0];
        const sampleSize = Math.min(lines.length, 200); // Limit to 200 rows
        const sampleData = [headers, ...lines.slice(1, sampleSize)].join('\n');
        // Generate insight using OpenAI
        console.log(`Generating insights with intent: ${intent}`);
        console.log(`Using prompt version: ${promptInfo.version}`);
        console.log(`Using sample of ${sampleSize} rows from CSV content`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
                { role: 'system', content: promptInfo.text },
                {
                    role: 'user',
                    content: `Here is a validated CRM export from an automotive dealership. Please analyze this data and provide insights:\n\n${sampleData}`
                }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
        });
        // Calculate duration
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        // Parse the response
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Failed to generate insights: Empty response from OpenAI');
        }
        // Parse JSON response
        const insightData = JSON.parse(content);
        // Validate response structure
        if (!insightData.title || !insightData.description || !Array.isArray(insightData.actionItems)) {
            throw new Error('Invalid insight format: Missing required fields');
        }
        // Log the insight run
        const insightRunData = {
            platform,
            promptIntent: intent,
            promptVersion: promptInfo.version,
            durationMs,
            outputSummary: [insightData.title]
        };
        logInsightRun(insightRunData);
        // Save result to structured directory
        const outputFilename = `insight_${Date.now()}`;
        const outputPath = saveResult(platform, insightData, outputFilename, {
            promptIntent: intent,
            promptVersion: promptInfo.version,
            durationMs,
            sampleSize
        });
        console.log(`Insight saved to: ${outputPath}`);
        return insightData;
    }
    catch (error) {
        // Calculate duration on error
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        // Prepare error message
        let errorMessage;
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        else {
            errorMessage = 'Unknown error';
        }
        // Log insight run with error
        const insightRunData = {
            platform,
            promptIntent: intent,
            promptVersion: 'error',
            durationMs,
            outputSummary: [],
            error: errorMessage
        };
        logInsightRun(insightRunData);
        console.error('Error generating insights:', error);
        // Save error details to results directory
        const errorFilename = `insight_error_${Date.now()}`;
        saveResult(platform, { error: errorMessage }, errorFilename, {
            promptIntent: intent,
            durationMs,
            status: 'error'
        });
        // Re-throw with meaningful message
        if (error instanceof Error) {
            throw new Error(`Failed to generate insights: ${error.message}`);
        }
        else {
            throw new Error(`Failed to generate insights: Unknown error`);
        }
    }
}
//# sourceMappingURL=generateInsightsFromCSV.js.map