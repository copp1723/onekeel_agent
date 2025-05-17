/**
 * Report Parsers
 *
 * Collection of utilities for parsing various report formats from CRM vendors
 * Supports CSV, Excel/XLSX, and PDF formats with appropriate transformations
 * Enhanced with retry and circuit breaker patterns for reliability
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse as csvParse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import pdfParse from 'pdf-parse';
import { retry } from './retry.js';
import { CircuitBreaker } from './circuitBreaker.js';
import { logger } from '../shared/logger.js';
// Define file format types
export type FileFormat = 'csv' | 'excel' | 'pdf' | 'unknown';
// Define parser options
export interface ParserOptions {
  /** Whether to trim whitespace from values (default: true) */
  trim?: boolean;
  /** Whether to skip empty lines (default: true) */
  skipEmptyLines?: boolean;
  /** Whether to use the first row as headers (default: true) */
  headers?: boolean;
  /** Custom column names to use instead of headers */
  columns?: string[];
  /** Vendor-specific options */
  vendorOptions?: Record<string, any>;
}
/**
 * Circuit breaker for file parsing operations
 */
const parserCircuitBreaker = new CircuitBreaker('file-parser-operations', {
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  inMemory: true,
  onStateChange: (from, to) => {
    logger.info(`File parser circuit breaker state changed from ${from} to ${to}`);
  },
});
/**
 * Parse CSV report file with retry and circuit breaker
 *
 * @param filePath - Path to the CSV file
 * @param options - Parser options
 * @returns Array of objects representing rows
 */
export async function parseCSV(
  filePath: string,
  options: ParserOptions = {}
): Promise<Record<string, any>[]> {
  return parserCircuitBreaker.execute(async () => {
    return retry(
      async () => {
        try {
          logger.info(`Parsing CSV file: ${path.basename(filePath)}`);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          // Parse CSV with header row
          const records = csvParse(fileContent, {
            columns: options.headers !== false,
            skip_empty_lines: options.skipEmptyLines !== false,
            trim: options.trim !== false,
          });
          logger.info(`Parsed ${records.length} records from CSV file: ${path.basename(filePath)}`);
          return records;
        } catch (error) {
          logger.error(`Error parsing CSV file ${filePath}:`, error);
          throw error;
        }
      },
      {
        retries: 2,
        minTimeout: 500,
        factor: 2,
        jitter: true,
      }
    );
  });
}
/**
 * Parse Excel report file with retry and circuit breaker
 *
 * @param filePath - Path to the Excel file
 * @param options - Parser options
 * @returns Array of objects representing rows
 */
export async function parseExcel(
  filePath: string,
  options: ParserOptions = {}
): Promise<Record<string, any>[]> {
  return parserCircuitBreaker.execute(async () => {
    return retry(
      async () => {
        try {
          logger.info(`Parsing Excel file: ${path.basename(filePath)}`);
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(filePath);
          // Use the first worksheet by default
          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            throw new Error(`No worksheets found in Excel file: ${filePath}`);
          }
          const records: Record<string, any>[] = [];
          const headers: string[] = [];
          // Process rows
          worksheet.eachRow((row, rowNumber) => {
            // First row is headers unless specified otherwise
            if (rowNumber === 1 && options.headers !== false) {
              row.eachCell((cell, colNumber) => {
                headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
              });
            } else {
              const record: Record<string, any> = {};
              row.eachCell((cell, colNumber) => {
                const header =
                  options.headers !== false ? headers[colNumber - 1] : `Column${colNumber}`;
                record[header] = cell.value;
              });
              records.push(record);
            }
          });
          logger.info(
            `Parsed ${records.length} records from Excel file: ${path.basename(filePath)}`
          );
          return records;
        } catch (error) {
          logger.error(`Error parsing Excel file ${filePath}:`, error);
          throw error;
        }
      },
      {
        retries: 2,
        minTimeout: 500,
        factor: 2,
        jitter: true,
      }
    );
  });
}
/**
 * Parse PDF report file with retry and circuit breaker
 *
 * @param filePath - Path to the PDF file
 * @param options - Parser options
 * @returns Array of objects representing extracted data
 */
export async function parsePDF(
  filePath: string,
  options: ParserOptions = {}
): Promise<Record<string, any>[]> {
  return parserCircuitBreaker.execute(async () => {
    return retry(
      async () => {
        try {
          logger.info(`Parsing PDF file: ${path.basename(filePath)}`);
          const dataBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(dataBuffer);
          // Extract text content
          const text = pdfData.text;
          logger.info(
            `Extracted ${text.length} characters from PDF file: ${path.basename(filePath)}`
          );
          // PDF parsing is more complex and vendor-specific
          // This is a simplified implementation that extracts tabular data
          return extractTabularDataFromPDF(text, options);
        } catch (error) {
          logger.error(`Error parsing PDF file ${filePath}:`, error);
          throw error;
        }
      },
      {
        retries: 3,
        minTimeout: 1000,
        factor: 2,
        jitter: true,
      }
    );
  });
}
/**
 * Extract tabular data from PDF text content
 * This is a simplified approach - real-world PDF parsing is more complex
 * and would require more sophisticated techniques for each vendor
 */
function extractTabularDataFromPDF(
  text: string,
  options: ParserOptions = {}
): Record<string, any>[] {
  try {
    // Split text into lines
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    // Try to identify header row (this is a simple heuristic)
    let headerLine = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      // Check if line has multiple words with capital letters
      const words = lines[i].split(/\s+/);
      if (words.length >= 3 && words.filter((w) => /^[A-Z]/.test(w)).length >= 3) {
        headerLine = i;
        break;
      }
    }
    // If no header line found, use the first line
    if (headerLine === -1 && lines.length > 0) {
      headerLine = 0;
    }
    // Extract headers
    const headers =
      options.columns ||
      (headerLine >= 0 ? lines[headerLine].split(/\s{2,}/).map((h) => h.trim()) : []);
    // Process data rows
    const records: Record<string, any>[] = [];
    for (let i = headerLine + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      // Split by multiple spaces (common in PDF tabular data)
      const values = line.split(/\s{2,}/).map((v) => v.trim());
      // Create record with headers
      const record: Record<string, any> = {};
      for (let j = 0; j < Math.min(headers.length, values.length); j++) {
        record[headers[j] || `Column${j + 1}`] = values[j];
      }
      // Add any remaining values
      for (let j = headers.length; j < values.length; j++) {
        record[`Column${j + 1}`] = values[j];
      }
      records.push(record);
    }
    logger.info(`Extracted ${records.length} records from PDF content`);
    return records;
  } catch (error) {
    logger.error('Error extracting tabular data from PDF:', error);
    return [];
  }
}
/**
 * Detect the format of a file based on its extension
 *
 * @param filePath - Path to the file
 * @returns File format: 'csv', 'excel', 'pdf', or 'unknown'
 */
export function detectFileFormat(filePath: string): FileFormat {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.csv':
      return 'csv';
    case '.xls':
    case '.xlsx':
      return 'excel';
    case '.pdf':
      return 'pdf';
    default:
      return 'unknown';
  }
}
/**
 * Auto-detect and parse a report file with retry and circuit breaker
 *
 * @param filePath - Path to the report file
 * @param options - Parser options
 * @returns Array of objects representing the report data
 */
export async function autoDetectAndParseReport(
  filePath: string,
  options: ParserOptions = {}
): Promise<Record<string, any>[]> {
  return retry(
    async () => {
      const format = detectFileFormat(filePath);
      switch (format) {
        case 'csv':
          return parseCSV(filePath, options);
        case 'excel':
          return parseExcel(filePath, options);
        case 'pdf':
          return parsePDF(filePath, options);
        default:
          throw new Error(`Unsupported file format: ${format} for file ${filePath}`);
      }
    },
    {
      retries: 2,
      minTimeout: 500,
      factor: 2,
      jitter: true,
      onRetry: (error, attempt) => {
        logger.warn(`Retry attempt ${attempt} for parsing file ${filePath}:`, {
          error: error?.message || String(error),
        });
      },
    }
  );
}
export default {
  parseCSV,
  parseExcel,
  parsePDF,
  detectFileFormat,
  autoDetectAndParseReport,
};
