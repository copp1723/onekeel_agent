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
    if (platform.toLowerCase() !== 'vinsolutions' && platform.toLowerCase() !== 'vauto') {
        throw new Error(`Unsupported CRM platform: ${platform}. Supported platforms: VinSolutions, VAUTO`);
    }
    // Check if we should use sample data
    if (process.env.USE_SAMPLE_DATA === 'true') {
        console.log(`Using sample data for ${platform} (dealer: ${dealerId})`);
        // Import dynamically to avoid circular dependencies
        const { createSampleReportFile } = await import('./sampleData.js');
        const normalizedPlatform = platform.toLowerCase() === 'vinsolutions' ? 'VinSolutions' : 'VAUTO';
        return await createSampleReportFile(dealerId, normalizedPlatform);
    }
    try {
        // Normalize platform name for configuration lookup
        const normalizedPlatform = platform.toLowerCase() === 'vinsolutions' ? 'VinSolutions' : 'VAUTO';
        // Get environment variables based on platform
        const envVars = {};
        if (normalizedPlatform === 'VinSolutions') {
            // For VinSolutions, we need username, password and OTP email credentials
            checkAndAssignEnvVar(envVars, 'VIN_SOLUTIONS_USERNAME');
            checkAndAssignEnvVar(envVars, 'VIN_SOLUTIONS_PASSWORD');
            checkAndAssignEnvVar(envVars, 'OTP_EMAIL_USER');
            checkAndAssignEnvVar(envVars, 'OTP_EMAIL_PASS');
        }
        else {
            // For VAUTO, we just need username and password
            checkAndAssignEnvVar(envVars, 'VAUTO_USERNAME');
            checkAndAssignEnvVar(envVars, 'VAUTO_PASSWORD');
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
/**
 * Parses a downloaded CRM report file
 * @param filePath - Path to the downloaded report file
 * @returns Parsed report data
 */
export async function parseCRMReport(filePath) {
    // Ensure the file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`Report file not found: ${filePath}`);
    }
    try {
        console.log(`Parsing CRM report file: ${filePath}`);
        // Read the file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        // Parse CSV content
        // This is a simplified implementation - in a real scenario, use a proper CSV parser
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim())
                continue;
            const values = lines[i].split(',').map(value => value.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
        // Return the parsed data
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