/**
 * Hybrid Ingestion and Flow Execution
 * 
 * This module provides a unified entrypoint for CRM report ingestion:
 * 1. First attempts to fetch reports from scheduled emails
 * 2. Falls back to browser automation if email ingestion fails
 * 
 * This orchestrator logs diagnostic information and provides a clean interface
 * for the rest of the application.
 */
import { runFlow } from './runFlow.js';
import { ReportNotFoundError, tryFetchReportFromEmail } from './ingestScheduledReport.js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Default console-based logger implementation
 */
export const consoleLogger = {
  info: (message, ...meta) => console.log(`[INFO] ${message}`, ...meta),
  warn: (message, ...meta) => console.warn(`[WARN] ${message}`, ...meta),
  error: (message, ...meta) => console.error(`[ERROR] ${message}`, ...meta)
};

/**
 * Orchestrates the hybrid ingestion process
 * First attempts email-based ingestion, then falls back to browser automation
 * 
 * @param {string} platform - The CRM platform (e.g., 'VinSolutions', 'VAUTO')
 * @param {Object} envVars - Environment variables needed for automation
 * @param {Object} logger - Optional logger for diagnostic information
 * @returns {Promise<string>} Path to the downloaded file
 */
export async function hybridIngestAndRunFlow(
  platform,
  envVars,
  logger = consoleLogger
) {
  const startTime = Date.now();
  let ingestionPath = 'email';
  
  logger.info(`Starting hybrid ingestion for ${platform}`);
  
  // Create downloads directory if it doesn't exist
  const downloadDir = envVars.DOWNLOAD_DIR || './downloads';
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  try {
    // Normalize platform name for consistency
    const platformMap = {
      'vinsolutions': 'VinSolutions',
      'vauto': 'VAUTO'
    };
    const normalizedPlatform = platformMap[platform.toLowerCase()] || platform;
    
    // STEP 1: First try email-based ingestion
    logger.info(`Attempting email ingestion for ${normalizedPlatform}...`);
    let filePath = null;
    
    try {
      filePath = await tryFetchReportFromEmail(normalizedPlatform);
      
      if (filePath) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`✅ Successfully fetched report via EMAIL in ${duration}s`, { 
          path: filePath, 
          platform: normalizedPlatform, 
          ingestionPath 
        });
        return filePath;
      }
      
      logger.warn(`No report found in email for ${normalizedPlatform}, falling back to browser automation`, {
        platform: normalizedPlatform
      });
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        logger.warn(`No report found in email: ${error.message}`);
      } else {
        logger.error(`Error during email ingestion:`, error);
        // Only propagate non-"ReportNotFound" errors if they appear fatal
        if (error instanceof Error && 
            !error.message.includes('No report') && 
            !error.message.includes('Missing required email configuration')) {
          throw error;
        }
      }
    }

    // STEP 2: Fall back to browser automation
    ingestionPath = 'browser';
    logger.info(`Starting browser automation for ${normalizedPlatform}...`);
    
    // Run the browser automation flow
    filePath = await runFlow(normalizedPlatform, envVars);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ Successfully fetched report via BROWSER in ${duration}s`, { 
      path: filePath, 
      platform: normalizedPlatform, 
      ingestionPath 
    });
    
    return filePath;
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`❌ Failed to fetch report after ${duration}s (path: ${ingestionPath})`, error);
    
    // Propagate the error with additional context
    if (error instanceof Error) {
      throw new Error(`Hybrid ingestion failed (${ingestionPath}): ${error.message}`);
    } else {
      throw new Error(`Hybrid ingestion failed (${ingestionPath}): ${String(error)}`);
    }
  }
}