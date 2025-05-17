/**
 * PDF Extraction Adapter
 *
 * A TypeScript adapter for PDF extraction using pdf-parse library.
 * Replaces legacy camelot implementation with standardized extraction methods.
 * Supports both lattice (bordered tables) and stream (whitespace-separated) extraction approaches.
 */

import fs from 'fs';
import pdfParse from 'pdf-parse';
import { isError } from './errorUtils.js';

/**
 * PDF Extraction Mode
 * - lattice: For PDFs with bordered tables (grid lines)
 * - stream: For PDFs with tables separated by whitespace
 */
export const PDFExtractionMode = {
  LATTICE: 'lattice',
  STREAM: 'stream',
  AUTO: 'auto'
};

/**
 * PDF Extraction Error
 */
export class PDFExtractionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PDFExtractionError';
  }
}

/**
 * @typedef {Object} PDFExtractionResult
 * @property {Array} tables - Extracted tables
 * @property {Object} metadata - Extraction metadata
 * @property {number} metadata.pageCount - Number of pages in PDF
 * @property {number} metadata.tableCount - Number of tables extracted
 * @property {PDFExtractionMode} metadata.extractionMode - Requested extraction mode
 * @property {PDFExtractionMode} metadata.actualExtractionMode - Actual extraction mode used
 * @property {number} metadata.confidence - Confidence score (0-1)
 * @property {Array<string>} [metadata.processingIssues] - Any processing issues encountered
 * @property {boolean} success - Whether extraction was successful
 * @property {string} [error] - Error message if extraction failed
 */

/**
 * Extract tables from a PDF file
 *
 * @param {Buffer} pdfBuffer - Buffer containing the PDF data
 * @param {Object} options - Extraction options
 * @param {string} [options.mode=PDFExtractionMode.AUTO] - Extraction mode (lattice, stream, auto)
 * @param {number} [options.minConfidence=0.7] - Minimum confidence threshold (0-1)
 * @returns {Promise<PDFExtractionResult>} Extraction result with tables and metadata
 */
export async function extractTablesFromPDF(pdfBuffer, options = {}) {
  console.log('Starting PDF extraction with options:', options);
  
  const {
    mode = PDFExtractionMode.AUTO,
    minConfidence = 0.7,
    ...otherOptions
  } = options;

  const result = {
    tables: [],
    metadata: {
      pageCount: 0,
      tableCount: 0,
      extractionMode: mode,
      actualExtractionMode: mode,
      confidence: 0,
      processingIssues: [],
    },
    success: false,
  };

  try {
    console.log('Parsing PDF buffer...');
    const { text, numpages } = await pdfParse(pdfBuffer);
    result.metadata.pageCount = numpages;
    console.log(`Parsed ${numpages} page(s)`);

    if (!text || text.trim().length === 0) {
      result.metadata.processingIssues.push('PDF contains no extractable text');
      result.error = 'PDF contains no extractable text';
      console.warn('PDF contains no extractable text');
      return result;
    }

    // Try different extraction methods based on mode
    if (mode === PDFExtractionMode.LATTICE || mode === PDFExtractionMode.AUTO) {
      try {
        const latticeResult = await extractLatticeMode(text, options);
        result.tables = latticeResult.tables;
        result.metadata.tableCount = latticeResult.metadata.tableCount;
        result.metadata.confidence = latticeResult.metadata.confidence;
        result.metadata.actualExtractionMode = PDFExtractionMode.LATTICE;
      } catch (error) {
        if (mode === PDFExtractionMode.LATTICE) throw error;
        // If in AUTO mode and LATTICE fails, try STREAM mode
        if (mode === PDFExtractionMode.AUTO) {
          result.metadata.processingIssues.push('LATTICE extraction failed, trying STREAM mode');
          const streamResult = await extractStreamMode(text, options);
          result.tables = streamResult.tables;
          result.metadata.tableCount = streamResult.metadata.tableCount;
          result.metadata.confidence = streamResult.metadata.confidence;
          result.metadata.actualExtractionMode = PDFExtractionMode.STREAM;
        }
      }
    } else if (mode === PDFExtractionMode.STREAM) {
      const streamResult = await extractStreamMode(text, options);
      result.tables = streamResult.tables;
      result.metadata.tableCount = streamResult.metadata.tableCount;
      result.metadata.confidence = streamResult.metadata.confidence;
      result.metadata.actualExtractionMode = PDFExtractionMode.STREAM;
    }

    // Check if extraction was successful
    result.success = result.tables.length > 0 && result.metadata.confidence >= minConfidence;
    
    if (!result.success && result.tables.length === 0) {
      result.error = 'No tables found in PDF';
      result.metadata.processingIssues?.push('No tables found in PDF');
    } else if (!result.success) {
      result.error = `Extraction confidence too low: ${result.metadata.confidence.toFixed(2)}`;
      result.metadata.processingIssues?.push(`Extraction confidence too low: ${result.metadata.confidence.toFixed(2)}`);
    }

    return result;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    return {
      tables: [],
      metadata: {
        pageCount: 0,
        tableCount: 0,
        extractionMode: options.mode || PDFExtractionMode.AUTO,
        actualExtractionMode: options.mode || PDFExtractionMode.AUTO,
        confidence: 0,
        processingIssues: [errorMessage],
      },
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Extract tables using lattice mode (for bordered tables)
 *
 * @param {string} text - PDF text content
 * @param {Object} options - Extraction options
 * @returns {Promise<PDFExtractionResult>} Extraction result
 */
async function extractLatticeMode(text, options) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const tables = [];
  let currentTable = [];
  let inTable = false;
  let tableStartLine = -1;

  // Simple heuristic: Look for lines with many separator characters
  // that might indicate table borders (-, +, |, etc.)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const borderChars = line.match(/[-+|=_]+/g);
    const isBorderLine = borderChars && borderChars.join('').length > line.length * 0.5;

    if (isBorderLine && !inTable) {
      // Start of a new table
      inTable = true;
      tableStartLine = i;
      currentTable = [];
    } else if (isBorderLine && inTable && currentTable.length > 0) {
      // End of current table
      inTable = false;
      const processedTable = processLatticeTable(currentTable, options);
      if (processedTable.length > 0) {
        tables.push(processedTable);
      }
      currentTable = [];
    } else if (inTable) {
      // Add line to current table
      currentTable.push(line);
    }
  }

  // Process any remaining table
  if (inTable && currentTable.length > 0) {
    const processedTable = processLatticeTable(currentTable, options);
    if (processedTable.length > 0) {
      tables.push(processedTable);
    }
  }

  const confidence = calculateLatticeConfidence(tables);
  
  return {
    tables,
    metadata: {
      pageCount: 1, // This will be overridden by the main function
      tableCount: tables.length,
      extractionMode: PDFExtractionMode.LATTICE,
      confidence,
    },
    success: tables.length > 0 && confidence >= (options.minConfidence || 0.7),
  };
}

/**
 * Process a lattice table (bordered table)
 * @param {string[]} tableLines - Lines of text in the table
 * @param {Object} options - Extraction options
 * @returns {Object[]} Processed table as array of records
 */
export function processLatticeTable(tableLines, options = {}) {
  if (tableLines.length < 2) return [];
  
  // Try to identify header row
  let headerLine = 0;
  for (let i = 0; i < Math.min(3, tableLines.length); i++) {
    const words = tableLines[i].split(/\s+/);
    if (words.length >= 3 && words.filter(w => /^[A-Z]/.test(w)).length >= 2) {
      headerLine = i;
      break;
    }
  }
  
  // Extract headers
  let headers;
  if (options.headers) {
    headers = options.headers;
  } else {
    headers = tableLines[headerLine]
      .split(/\s{2,}/)
      .map(h => h.trim())
      .filter(h => h.length > 0);
  }
  
  if (headers.length < 2) return [];
  
  // Process data rows
  const records = [];
  for (let i = headerLine + 1; i < tableLines.length; i++) {
    const line = tableLines[i];
    if (line.trim().length === 0) continue;
    
    // Split by multiple spaces (common in PDF tables)
    const values = line.split(/\s{2,}/).map(v => v.trim()).filter(v => v.length > 0);
    
    if (values.length >= Math.max(2, headers.length * 0.5)) {
      const record = {};
      // Map values to headers
      for (let j = 0; j < Math.min(headers.length, values.length); j++) {
        record[headers[j]] = options.trim ? values[j].trim() : values[j];
      }
      // Add any remaining values to an "extra" field
      if (values.length > headers.length) {
        record['extra'] = values.slice(headers.length).join(' ');
      }
      records.push(record);
    }
  }
  
  return records;
}

/**
 * Calculate confidence score for lattice extraction
 * @param {Object[][]} tables - Extracted tables
 * @returns {number} Confidence score (0-1)
 */
export function calculateLatticeConfidence(tables) {
  if (tables.length === 0) return 0;
  
  // Calculate average number of fields per record
  let totalFields = 0;
  let totalRecords = 0;
  
  for (const table of tables) {
    for (const record of table) {
      totalFields += Object.keys(record).length;
      totalRecords++;
    }
  }
  
  const avgFields = totalRecords > 0 ? totalFields / totalRecords : 0;
  
  // Calculate consistency of fields across records
  let fieldConsistency = 1;
  if (totalRecords > 1) {
    let fieldVariance = 0;
    for (const table of tables) {
      for (const record of table) {
        const fieldCount = Object.keys(record).length;
        fieldVariance += Math.pow(fieldCount - avgFields, 2);
      }
    }
    const stdDev = Math.sqrt(fieldVariance / totalRecords);
    fieldConsistency = Math.max(0, 1 - (stdDev / avgFields));
  }
  
  // Combine factors for final confidence
  const confidence = (
    (avgFields >= 3 ? 0.7 : avgFields / 3 * 0.7) + // More fields = higher confidence
    (fieldConsistency * 0.3) // Consistent field count = higher confidence
  );
  
  return Math.min(1, Math.max(0, confidence));
}

/**
 * Extract tables using stream mode (for whitespace-separated tables)
 * @param {string} text - PDF text content
 * @param {Object} options - Extraction options
 * @returns {Promise<PDFExtractionResult>} Extraction result
 */
export async function extractStreamMode(text, options = {}) {
  try {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const tables = [];
    let currentTableLines = [];
    let potentialTableStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      
      const words = line.split(/\s+/);
      const hasMultipleWords = words.length >= 3;
      const hasCapsWords = words.filter(w => /^[A-Z]/.test(w)).length >= 2;
      
      if (hasMultipleWords && hasCapsWords && potentialTableStart === -1) {
        potentialTableStart = i;
        currentTableLines = [line];
      } else if (potentialTableStart !== -1) {
        if (hasMultipleWords) {
          currentTableLines.push(line);
        } else if (currentTableLines.length >= 3) {
          const processedTable = processStreamTable(currentTableLines, options);
          if (processedTable.length > 0) {
            tables.push(processedTable);
          }
          potentialTableStart = -1;
          currentTableLines = [];
        } else {
          potentialTableStart = -1;
          currentTableLines = [];
        }
      }
    }
    
    if (potentialTableStart !== -1 && currentTableLines.length >= 3) {
      const processedTable = processStreamTable(currentTableLines, options);
      if (processedTable.length > 0) {
        tables.push(processedTable);
      }
    }
    
    const confidence = calculateStreamConfidence(tables);
    
    return {
      tables,
      metadata: {
        pageCount: 1, // This will be overridden by the main function
        tableCount: tables.length,
        extractionMode: PDFExtractionMode.STREAM,
        confidence,
      },
      success: tables.length > 0 && confidence >= (options.minConfidence || 0.7),
    };
  } catch (error) {
    return {
      tables: [],
      metadata: {
        pageCount: 0,
        tableCount: 0,
        extractionMode: PDFExtractionMode.STREAM,
        confidence: 0,
        processingIssues: [error.message || String(error)],
      },
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Process a stream table (whitespace-separated table)
 * @param {string[]} tableLines - Lines of text in the table
 * @param {Object} options - Extraction options
 * @returns {Object[]} Processed table as array of records
 */
export function processStreamTable(tableLines, options = {}) {
  if (tableLines.length < 2) return [];
  
  // Extract headers from the first line
  let headers;
  if (options.headers) {
    headers = options.headers;
  } else {
    // For stream tables, we need to detect column positions based on whitespace
    const headerLine = tableLines[0];
    headers = headerLine
      .split(/\s{2,}/)
      .map(h => h.trim())
      .filter(h => h.length > 0);
  }
  
  if (headers.length < 2) return [];
  
  // Process data rows
  const records = [];
  for (let i = 1; i < tableLines.length; i++) {
    const line = tableLines[i];
    if (line.trim().length === 0) continue;
    
    // Split by multiple spaces (common in PDF tables)
    const values = line.split(/\s{2,}/).map(v => v.trim()).filter(v => v.length > 0);
    
    if (values.length >= Math.max(2, headers.length * 0.5)) {
      const record = {};
      // Map values to headers
      for (let j = 0; j < Math.min(headers.length, values.length); j++) {
        record[headers[j]] = options.trim ? values[j].trim() : values[j];
      }
      // Add any remaining values to an "extra" field
      if (values.length > headers.length) {
        record['extra'] = values.slice(headers.length).join(' ');
      }
      records.push(record);
    }
  }
  
  return records;
}

/**
 * Calculate confidence score for stream extraction
 * @param {Object[][]} tables - Extracted tables
 * @returns {number} Confidence score (0-1)
 */
export function calculateStreamConfidence(tables) {
  if (tables.length === 0) return 0;
  
  // Similar to lattice confidence calculation
  let totalFields = 0;
  let totalRecords = 0;
  
  for (const table of tables) {
    for (const record of table) {
      totalFields += Object.keys(record).length;
      totalRecords++;
    }
  }
  
  const avgFields = totalRecords > 0 ? totalFields / totalRecords : 0;
  
  // Calculate consistency of fields across records
  let fieldConsistency = 1;
  if (totalRecords > 1) {
    let fieldVariance = 0;
    for (const table of tables) {
      for (const record of table) {
        const fieldCount = Object.keys(record).length;
        fieldVariance += Math.pow(fieldCount - avgFields, 2);
      }
    }
    const stdDev = Math.sqrt(fieldVariance / totalRecords);
    fieldConsistency = Math.max(0, 1 - (stdDev / avgFields));
  }
  
  // Stream mode is typically less reliable than lattice mode
  // so we apply a small penalty to the confidence
  const confidence = (
    (avgFields >= 3 ? 0.6 : avgFields / 3 * 0.6) + // More fields = higher confidence
    (fieldConsistency * 0.3) // Consistent field count = higher confidence
  ) * 0.9; // Apply a small penalty for stream mode
  
  return Math.min(1, Math.max(0, confidence));
}

/**
 * Extract tables from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @param {Object} options - Extraction options
 * @returns {Promise<PDFExtractionResult>} Extraction result with tables and metadata
 * @throws {PDFExtractionError}
 */
export async function extractTablesFromPDFFile(filePath, options = {}) {
  try {
    const pdfBuffer = await fs.promises.readFile(filePath);
    return await extractTablesFromPDF(pdfBuffer, options);
  } catch (error) {
    const errorMessage = error?.message || String(error);
    return {
      tables: [],
      metadata: {
        pageCount: 0,
        tableCount: 0,
        extractionMode: options.mode || PDFExtractionMode.AUTO,
        actualExtractionMode: options.mode || PDFExtractionMode.AUTO,
        confidence: 0,
        processingIssues: [errorMessage],
      },
      success: false,
      error: errorMessage,
    };
  }
}
