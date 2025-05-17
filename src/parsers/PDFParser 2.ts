/**
 * PDF Parser
 * 
 * Implementation of the parser interface for PDF files.
 */

import pdfParse from 'pdf-parse';
import path from 'path';
import logger from '../utils/logger.js';
import { BaseParser } from './BaseParser.js';
import { FileType, ParserOptions, ParserResult } from '../interfaces/Parser.js';
import { ParseError } from './errors/ParserError.js';

/**
 * PDF extraction mode
 */
export enum PDFExtractionMode {
  LATTICE = 'lattice', // For PDFs with bordered tables (grid lines)
  STREAM = 'stream',   // For PDFs with tables separated by whitespace
  AUTO = 'auto',       // Try both methods and select the best result
}

/**
 * PDF-specific parser options
 */
export interface PDFParserOptions extends ParserOptions {
  /**
   * Extraction mode for tables (default: AUTO)
   */
  extractionMode?: PDFExtractionMode;
  
  /**
   * Whether to include page text in the result (default: false)
   */
  includeText?: boolean;
  
  /**
   * Minimum confidence level for table extraction (default: 0.7)
   */
  minConfidence?: number;
  
  /**
   * Page numbers to extract (default: all pages)
   */
  pages?: number[];
  
  /**
   * Whether to extract tables (default: true)
   */
  extractTables?: boolean;
  
  /**
   * Whether to extract forms (default: false)
   */
  extractForms?: boolean;
}

/**
 * Parser implementation for PDF files
 */
export class PDFParser extends BaseParser {
  /**
   * Constructor for the PDF parser
   */
  constructor() {
    super([FileType.PDF]);
  }

  /**
   * Parse PDF content
   * 
   * @param content - PDF content as Buffer
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseContent(content: string | Buffer, options: PDFParserOptions = {}): Promise<ParserResult> {
    try {
      // Ensure content is a Buffer
      const pdfContent = Buffer.isBuffer(content) ? content : Buffer.from(content.toString(), 'binary');
      
      // Parse the PDF
      const pdfData = await pdfParse(pdfContent);
      
      // Extract text content
      const text = pdfData.text;
      
      logger.info({
        event: 'extracted_pdf_text',
        file: options._fileName || 'unknown',
        charCount: text.length,
        timestamp: new Date().toISOString(),
      }, 'Extracted PDF text');
      
      // Extract tabular data
      let records: Record<string, any>[] = [];
      let extractionMode = options.extractionMode || PDFExtractionMode.AUTO;
      let confidence = 0;
      
      if (options.extractTables !== false) {
        const extractionResult = await this.extractTablesFromPDF(text, extractionMode, options);
        records = extractionResult.records;
        extractionMode = extractionResult.mode;
        confidence = extractionResult.confidence;
      }
      
      // Extract form data if requested
      if (options.extractForms) {
        const formData = await this.extractFormsFromPDF(pdfData);
        if (formData.length > 0) {
          // Add form data as a record
          records.push({
            _type: 'form',
            ...formData.reduce((acc, field) => {
              acc[field.name] = field.value;
              return acc;
            }, {} as Record<string, any>),
          });
        }
      }
      
      // Validate with schema if provided
      const validatedRecords = this.validateWithSchema(records, options.schema);
      
      logger.info({
        event: 'parsed_pdf_records',
        file: options._fileName || 'unknown',
        recordsCount: validatedRecords.length,
        extractionMode,
        confidence,
        timestamp: new Date().toISOString(),
      }, 'Parsed PDF records');
      
      // Create and return the result
      return this.createResult(validatedRecords, {
        ...options,
        _metadata: {
          pageCount: pdfData.numpages,
          extractionMode,
          confidence,
          text: options.includeText ? text : undefined,
          info: pdfData.info,
          metadata: pdfData.metadata,
        },
      });
    } catch (error) {
      // Log error
      logger.error({
        event: 'pdf_parser_error',
        file: options._fileName || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        parser: 'PDFParser',
      });
      
      // Throw a ParseError with context
      throw new ParseError(
        `Failed to parse PDF content: ${error instanceof Error ? error.message : String(error)}`,
        {
          fileName: options._fileName,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          originalError: error,
        }
      );
    }
  }
  
  /**
   * Extract tables from PDF text
   * 
   * @param text - PDF text content
   * @param mode - Extraction mode
   * @param options - Parser options
   * @returns Extracted records and metadata
   */
  private async extractTablesFromPDF(
    text: string,
    mode: PDFExtractionMode,
    options: PDFParserOptions
  ): Promise<{
    records: Record<string, any>[];
    mode: PDFExtractionMode;
    confidence: number;
  }> {
    // This is a simplified implementation
    // In a real implementation, this would use a more sophisticated table extraction algorithm
    
    // For now, we'll use a simple line-based approach
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Try to detect tables in the text
    const records: Record<string, any>[] = [];
    let confidence = 0;
    let effectiveMode = mode;
    
    if (mode === PDFExtractionMode.AUTO || mode === PDFExtractionMode.LATTICE) {
      // Try lattice mode (looking for grid-like structures)
      const latticeResult = this.extractLatticeMode(lines);
      
      if (latticeResult.records.length > 0 && latticeResult.confidence > (options.minConfidence || 0.7)) {
        records.push(...latticeResult.records);
        confidence = latticeResult.confidence;
        effectiveMode = PDFExtractionMode.LATTICE;
      } else if (mode === PDFExtractionMode.AUTO) {
        // If lattice mode didn't work well and we're in AUTO mode, try stream mode
        const streamResult = this.extractStreamMode(lines);
        
        if (streamResult.records.length > 0) {
          records.push(...streamResult.records);
          confidence = streamResult.confidence;
          effectiveMode = PDFExtractionMode.STREAM;
        }
      }
    } else if (mode === PDFExtractionMode.STREAM) {
      // Use stream mode directly
      const streamResult = this.extractStreamMode(lines);
      records.push(...streamResult.records);
      confidence = streamResult.confidence;
    }
    
    return {
      records,
      mode: effectiveMode,
      confidence,
    };
  }
  
  /**
   * Extract tables using lattice mode (grid-based)
   * 
   * @param lines - Text lines from PDF
   * @returns Extracted records and confidence
   */
  private extractLatticeMode(lines: string[]): { records: Record<string, any>[]; confidence: number } {
    // This is a simplified implementation
    // In a real implementation, this would look for grid patterns in the text
    
    // For now, we'll just look for lines with consistent delimiters
    const records: Record<string, any>[] = [];
    let confidence = 0;
    
    // Look for potential header rows (lines with multiple words)
    const headerCandidates = lines.filter(line => 
      line.split(/\s+/).filter(word => word.length > 0).length >= 3
    );
    
    if (headerCandidates.length > 0) {
      // Use the first candidate as header
      const headerLine = headerCandidates[0];
      const headers = headerLine.split(/\s+/).filter(word => word.length > 0);
      
      // Look for data rows that might match this header pattern
      const dataLines = lines.filter(line => 
        line !== headerLine && 
        line.split(/\s+/).filter(word => word.length > 0).length === headers.length
      );
      
      // Create records from data lines
      for (const line of dataLines) {
        const values = line.split(/\s+/).filter(word => word.length > 0);
        const record: Record<string, any> = {};
        
        for (let i = 0; i < headers.length && i < values.length; i++) {
          record[headers[i]] = values[i];
        }
        
        records.push(record);
      }
      
      // Calculate confidence based on consistency
      confidence = dataLines.length > 0 ? 0.8 : 0.3;
    }
    
    return { records, confidence };
  }
  
  /**
   * Extract tables using stream mode (whitespace-based)
   * 
   * @param lines - Text lines from PDF
   * @returns Extracted records and confidence
   */
  private extractStreamMode(lines: string[]): { records: Record<string, any>[]; confidence: number } {
    // This is a simplified implementation
    // In a real implementation, this would use whitespace patterns to detect tables
    
    // For now, we'll look for lines with consistent column positions
    const records: Record<string, any>[] = [];
    let confidence = 0;
    
    // Group lines that might be part of the same table
    const lineGroups: string[][] = [];
    let currentGroup: string[] = [];
    
    for (const line of lines) {
      if (line.trim().length === 0) {
        if (currentGroup.length > 0) {
          lineGroups.push(currentGroup);
          currentGroup = [];
        }
      } else {
        currentGroup.push(line);
      }
    }
    
    if (currentGroup.length > 0) {
      lineGroups.push(currentGroup);
    }
    
    // Process each group as a potential table
    for (const group of lineGroups) {
      if (group.length < 2) continue; // Need at least header and one data row
      
      // Assume first line is header
      const headerLine = group[0];
      const headerPositions: number[] = [];
      let pos = 0;
      
      // Find positions of words in header
      for (const match of headerLine.matchAll(/\S+/g)) {
        if (match.index !== undefined) {
          headerPositions.push(match.index);
        }
      }
      
      if (headerPositions.length < 2) continue; // Need at least 2 columns
      
      // Extract headers
      const headers: string[] = [];
      for (let i = 0; i < headerPositions.length; i++) {
        const start = headerPositions[i];
        const end = i < headerPositions.length - 1 ? headerPositions[i + 1] : headerLine.length;
        headers.push(headerLine.substring(start, end).trim());
      }
      
      // Process data rows
      for (let i = 1; i < group.length; i++) {
        const dataLine = group[i];
        const record: Record<string, any> = {};
        
        // Extract values based on header positions
        for (let j = 0; j < headerPositions.length; j++) {
          const start = headerPositions[j];
          const end = j < headerPositions.length - 1 ? headerPositions[j + 1] : dataLine.length;
          
          if (start < dataLine.length) {
            const value = dataLine.substring(start, Math.min(end, dataLine.length)).trim();
            record[headers[j]] = value;
          } else {
            record[headers[j]] = '';
          }
        }
        
        records.push(record);
      }
      
      // Calculate confidence based on consistency
      confidence = group.length > 2 ? 0.7 : 0.5;
    }
    
    return { records, confidence };
  }
  
  /**
   * Extract form data from PDF
   * 
   * @param pdfData - PDF data from pdf-parse
   * @returns Array of form fields
   */
  private async extractFormsFromPDF(pdfData: any): Promise<Array<{ name: string; value: any }>> {
    // This is a placeholder implementation
    // In a real implementation, this would extract form fields from the PDF
    
    // For now, we'll just return an empty array
    return [];
  }
}
