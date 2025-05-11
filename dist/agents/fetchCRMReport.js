/**
 * CRM Report Fetching Tool
 * Uses the generic runFlow system to fetch reports from different CRM platforms
 */
import { runFlow } from './runFlow.js';
import * as fs from 'fs';
/**
 * Fetches a CRM report from the specified platform
 * @param options - Options for fetching the report
 * @returns Path to the downloaded report file
 */
export async function fetchCRMReport(options) {
    const { platform, dealerId } = options;
    console.log(`Fetching CRM report for dealer ${dealerId} from ${platform}...`);
    // Validate platform is supported
    const supportedPlatforms = ['vinsolutions', 'vauto'];
    if (!platform || !supportedPlatforms.includes(platform.toLowerCase())) {
        throw new Error(`Unsupported CRM platform: ${platform}. Supported platforms: VinSolutions, VAUTO`);
    }
    // Validate dealer ID
    if (!dealerId) {
        throw new Error('Missing required parameter: dealerId');
    }
    // Check if we should use sample data
    if (process.env.USE_SAMPLE_DATA === 'true') {
        console.log(`Using sample data for ${platform} (dealer: ${dealerId})`);
        // Import dynamically to avoid circular dependencies
        const { createSampleReportFile } = await import('./sampleData.js');
        const platformMap = {
            'vinsolutions': 'VinSolutions',
            'vauto': 'VAUTO'
        };
        const normalizedPlatform = platformMap[platform.toLowerCase()];
        return await createSampleReportFile(dealerId, normalizedPlatform);
    }
    try {
        // Normalize platform name for configuration lookup
        const platformMap = {
            'vinsolutions': 'VinSolutions',
            'vauto': 'VAUTO'
        };
        const normalizedPlatform = platformMap[platform.toLowerCase()];
        // Get environment variables based on platform
        const envVars = {};
        // Define required environment variables for each platform
        const requiredEnvVars = {
            'VinSolutions': ['VIN_SOLUTIONS_USERNAME', 'VIN_SOLUTIONS_PASSWORD', 'OTP_EMAIL_USER', 'OTP_EMAIL_PASS'],
            'VAUTO': ['VAUTO_USERNAME', 'VAUTO_PASSWORD']
        };
        // Check for required environment variables
        const requiredVars = requiredEnvVars[normalizedPlatform] || [];
        for (const varName of requiredVars) {
            checkAndAssignEnvVar(envVars, varName);
        }
        // Run the flow for the specified platform
        const filePath = await runFlow(normalizedPlatform, envVars);
        console.log(`CRM report fetched successfully. File path: ${filePath}`);
        return filePath;
    }
    catch (error) {
        console.error(`Error fetching CRM report from ${platform}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch CRM report: ${errorMessage}`);
    }
}
/**
 * Helper to check if environment variable exists and add it to the envVars object
 */
function checkAndAssignEnvVar(envVars, name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Required environment variable ${name} is not set`);
    }
    envVars[name] = value;
}
export async function parseCRMReport(filePath) {
    // Ensure the file exists and is readable
    try {
        await fs.promises.access(filePath, fs.constants.R_OK);
    }
    catch (error) {
        throw new Error(`Report file not found or not readable: ${filePath}`);
    }
    try {
        console.log(`Parsing CRM report file: ${filePath}`);
        // Read the file
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        // Parse CSV content - using a simple parser for demo
        // In production code, a robust CSV parser library would be used
        const lines = fileContent.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            throw new Error('CSV file is empty');
        }
        const headers = lines[0].split(',').map(header => header.trim());
        const data = [];
        // Process each data row
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim());
            // Skip rows with insufficient values
            if (values.length < headers.length / 2)
                continue;
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
        // Return the parsed data with proper type
        return {
            totalRecords: data.length,
            headers,
            data
        };
    }
    catch (error) {
        console.error(`Error parsing CRM report:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to parse CRM report: ${errorMessage}`);
    }
}
//# sourceMappingURL=fetchCRMReport.js.map