/**
 * Email Ingestion and Flow Execution
 *
 * This module provides a unified entrypoint for CRM report ingestion via email:
 * - Fetches reports from scheduled emails
 * - Parses attachments based on file type
 * - Stores results in structured directories and database
 * - Generates insights from parsed data
 * - Provides detailed error handling and diagnostics
 */
import path from 'path';
import { isError } from '../utils/errorUtils.js.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { tryFetchReportFromEmail } from './ingestScheduledReport.js.js';
import { parseByExtension } from '../services/attachmentParsers.js.js';
import { storeResults } from '../services/resultsPersistence.js.js';
import { generateInsights } from '../services/insightGenerator.js.js';
import { EnvVars } from '../types.js.js';
import logger from '../utils/logger.js.js';
// Simple console logger delegating to structured logger
export const consoleLogger = {
  info: (message: string, meta?: Record<string, any>) => {
    logger.info({ event: 'email_flow_info', message, ...meta, timestamp: new Date().toISOString() }, message);
  },
  error: (message: string, meta?: Record<string, any>) => {
    logger.error({ event: 'email_flow_error', message, ...meta, timestamp: new Date().toISOString() }, message);
  },
  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn({ event: 'email_flow_warn', message, ...meta, timestamp: new Date().toISOString() }, message);
  },
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.DEBUG) {
      logger.debug({ event: 'email_flow_debug', message, ...meta, timestamp: new Date().toISOString() }, message);
    }
  }
};
// Logger interface
export interface Logger {
  info: (message: string, meta?: Record<string, any>) => void;
  error: (message: string, meta?: Record<string, any>) => void;
  warn: (message: string, meta?: Record<string, any>) => void;
  debug: (message: string, meta?: Record<string, any>) => void;
}
/**
 * Complete email ingestion, parsing, storage, and insight generation flow
 * 
 * @param platform - The CRM platform (e.g., 'VinSolutions', 'VAUTO')
 * @param envVars - Environment variables needed for configuration
 * @param logger - Optional logger for diagnostic information
 * @param options - Optional configuration options
 * @returns Object containing report and insight information
 */
export async function emailIngestAndRunFlow(
  platform: string,
  envVars: EnvVars,
  logger: Logger = consoleLogger,
  options: {
    intent?: string;
    skipInsights?: boolean;
  } = {}
): Promise<{
  reportId: string;
  reportPath: string;
  jsonPath: string;
  insightId?: string;
  insightPath?: string;
}> {
  const startTime = Date.now();
  logger.info(`Starting complete data flow for ${platform}`);
  try {
    // Step 1: Fetch report from email
    logger.info(`Fetching report from email for ${platform}`);
    const reportPath = await tryFetchReportFromEmail(platform);
    if (!reportPath || !fs.existsSync(reportPath)) {
      throw new Error(`Failed to fetch report for ${platform}`);
    }
    logger.info(`Successfully fetched report: ${reportPath}`);
    // Extract email metadata if available
    const emailMetadata = {
      subject: envVars.LAST_EMAIL_SUBJECT || undefined,
      from: envVars.LAST_EMAIL_FROM || undefined,
      date: envVars.LAST_EMAIL_DATE ? new Date(envVars.LAST_EMAIL_DATE) : undefined
    };
    // Step 2: Parse the attachment
    logger.info(`Parsing attachment: ${path.basename(reportPath)}`);
    const parsedData = await parseByExtension(reportPath, {
      vendor: platform,
      reportType: options.intent! || 'sales_report'
    });
    logger.info(`Successfully parsed ${parsedData.recordCount} records`);
    // Step 3: Store results
    logger.info(`Storing results for ${platform}`);
    const storageResult = await storeResults(
      platform,
      parsedData,
      {
        sourceType: 'email',
        emailSubject: emailMetadata.subject,
        emailFrom: emailMetadata.from,
        emailDate: emailMetadata.date,
        filePath: reportPath,
        metadata: {
          emailMetadata,
          parseTime: Date.now() - startTime
        }
      }
    );
    logger.info(`Successfully stored results`, {
      reportId: storageResult.id,
      jsonPath: storageResult.jsonPath,
      recordCount: storageResult.recordCount
    });
    // Step 4: Generate insights (if not skipped)
    if (!options.skipInsights) {
      logger.info(`Generating insights for ${platform}`);
      const insightResult = await generateInsights(
        parsedData,
        platform,
        {
          intent: options.intent! || 'automotive_analysis'
        }
      );
      logger.info(`Successfully generated insights`, {
        insightId: insightResult.insightId,
        title: insightResult.insight.title
      });
      // Return complete result
      return {
        reportId: storageResult.id,
        reportPath,
        jsonPath: storageResult.jsonPath,
        insightId: insightResult.insightId,
        insightPath: insightResult.metadata.outputPath
      };
    }
    // Return result without insights
    return {
      reportId: storageResult.id,
      reportPath,
      jsonPath: storageResult.jsonPath
    };
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    const errorMessage = error instanceof Error ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error) : String(error);
    logger.error(`Error in data flow: ${errorMessage}`);
    // Create error report for tracking
    const errorReport = {
      timestamp: new Date().toISOString(),
      platform,
      error: errorMessage,
      stack: error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined) : undefined,
      duration: Date.now() - startTime
    };
    // Save error report
    const errorDir = path.join(process.cwd(), 'logs', 'errors');
    if (!fs.existsSync(errorDir)) {
      fs.mkdirSync(errorDir, { recursive: true });
    }
    const errorFile = path.join(errorDir, `error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify(errorReport, null, 2));
    throw error;
  }
}
/**
 * Create a sample report for testing
 * 
 * @param platform - CRM platform name
 * @returns Path to the created sample report
 */
export async function createSampleReport(platform: string): Promise<string> {
  // Create downloads directory if it doesn't exist
  const downloadDir = process.env.DOWNLOAD_DIR || './downloads';
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  // Create a unique filename
  const reportFileName = `${platform}_report_${Date.now()}.csv`;
  const reportPath = path.join(downloadDir, reportFileName);
  // Create a sample report with example data
  const sampleData = `Date,Customer,Vehicle,Status,Price,LeadSource,SalesPerson,DaysOnLot
2025-05-13,Customer A,Toyota Camry SE,New Lead,$28500,Website,Rep 1,15
2025-05-13,Customer B,Honda Accord LX,Test Drive,$31200,Phone,Rep 2,22
2025-05-13,Customer C,Ford F-150 XLT,Negotiation,$42750,Walk-in,Rep 3,8
2025-05-13,Customer D,Chevrolet Tahoe LT,Purchased,$55300,Referral,Rep 1,30
2025-05-13,Customer E,Nissan Altima S,New Lead,$26400,Website,Rep 4,12`;
  fs.writeFileSync(reportPath, sampleData);
  logger.info({ event: 'sample_report_created', platform, reportPath, timestamp: new Date().toISOString() }, 'Created sample report');
  return reportPath;
}
/**
 * Run the complete data flow with a sample report (for testing)
 * 
 * @param platform - The CRM platform (e.g., 'VinSolutions', 'VAUTO')
 * @param options - Optional configuration options
 * @returns Object containing report and insight information
 */
export async function runSampleDataFlow(
  platform: string,
  options: {
    intent?: string;
    skipInsights?: boolean;
  } = {}
): Promise<{
  reportId: string;
  reportPath: string;
  jsonPath: string;
  insightId?: string;
  insightPath?: string;
}> {
  const logger = consoleLogger;
  logger.info(`Starting sample data flow for ${platform}`);
  try {
    // Create a sample report
    const reportPath = await createSampleReport(platform);
    // Parse the attachment
    logger.info(`Parsing sample attachment: ${path.basename(reportPath)}`);
    const parsedData = await parseByExtension(reportPath, {
      vendor: platform,
      reportType: options.intent! || 'sales_report'
    });
    logger.info(`Successfully parsed ${parsedData.recordCount} records`);
    // Store results
    logger.info(`Storing sample results for ${platform}`);
    const storageResult = await storeResults(
      platform,
      parsedData,
      {
        sourceType: 'sample',
        filePath: reportPath,
        metadata: {
          sample: true,
          createdAt: new Date().toISOString()
        }
      }
    );
    logger.info(`Successfully stored sample results`, {
      reportId: storageResult.id,
      jsonPath: storageResult.jsonPath,
      recordCount: storageResult.recordCount
    });
    // Generate insights (if not skipped)
    if (!options.skipInsights) {
      logger.info(`Generating insights for sample data`);
      const insightResult = await generateInsights(
        parsedData,
        platform,
        {
          intent: options.intent! || 'automotive_analysis'
        }
      );
      logger.info(`Successfully generated insights for sample data`, {
        insightId: insightResult.insightId,
        title: insightResult.insight.title
      });
      // Return complete result
      return {
        reportId: storageResult.id,
        reportPath,
        jsonPath: storageResult.jsonPath,
        insightId: insightResult.insightId,
        insightPath: insightResult.metadata.outputPath
      };
    }
    // Return result without insights
    return {
      reportId: storageResult.id,
      reportPath,
      jsonPath: storageResult.jsonPath
    };
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    const errorMessage = error instanceof Error ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error) : String(error);
    logger.error(`Error in sample data flow: ${errorMessage}`);
    throw error;
  }
}
export default emailIngestAndRunFlow;
