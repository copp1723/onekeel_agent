/**
 * XLSX Parser
 *
 * Implementation of the parser interface for Excel (XLSX/XLS) files.
 */

import ExcelJS from 'exceljs';
import path from 'path';
import logger from '../utils/logger.js';
import { BaseParser } from './BaseParser.js';
import { FileType, ParserOptions, ParserResult } from '../interfaces/Parser.js';
import { ParseError } from './errors/ParserError.js';

/**
 * XLSX-specific parser options
 */
export interface XLSXParserOptions extends ParserOptions {
  /**
   * Names of sheets to parse (default: first sheet)
   */
  sheetNames?: string[];

  /**
   * Index of sheet to parse (default: 0)
   */
  sheetIndex?: number;

  /**
   * Row to start parsing from (default: 1)
   */
  headerRow?: number;

  /**
   * Whether to include empty cells (default: false)
   */
  includeEmptyCells?: boolean;

  /**
   * Whether to parse all sheets (default: false)
   */
  parseAllSheets?: boolean;

  /**
   * Whether to merge all sheets into a single result (default: false)
   * Only applicable if parseAllSheets is true
   */
  mergeSheets?: boolean;
}

/**
 * Parser implementation for Excel files
 */
export class XLSXParser extends BaseParser {
  /**
   * Constructor for the XLSX parser
   */
  constructor() {
    super([FileType.XLSX, FileType.XLS]);
  }

  /**
   * Parse Excel content
   *
   * @param content - Excel content as Buffer
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseContent(content: string | Buffer, options: XLSXParserOptions = {}): Promise<ParserResult> {
    try {
      // Ensure content is a Buffer
      const xlsxContent = Buffer.isBuffer(content) ? content : Buffer.from(content.toString(), 'binary');

      // Create a workbook from the buffer
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(xlsxContent);

      // Extract sheet names for metadata
      const allSheetNames = workbook.worksheets.map(sheet => sheet.name);

      // Determine which sheets to process
      let sheetsToProcess: ExcelJS.Worksheet[] = [];

      if (options.parseAllSheets) {
        // Process all sheets
        sheetsToProcess = workbook.worksheets;
      } else if (options.sheetNames && options.sheetNames.length > 0) {
        // Process specified sheets
        for (const sheetName of options.sheetNames) {
          const worksheet = workbook.getWorksheet(sheetName);
          if (worksheet) {
            sheetsToProcess.push(worksheet);
          }
        }
      } else if (options.sheetIndex !== undefined) {
        // Process sheet at specified index
        const worksheet = workbook.worksheets[options.sheetIndex];
        if (worksheet) {
          sheetsToProcess.push(worksheet);
        }
      } else {
        // Default to first sheet
        const worksheet = workbook.worksheets[0];
        if (worksheet) {
          sheetsToProcess.push(worksheet);
        }
      }

      if (sheetsToProcess.length === 0) {
        throw new ParseError('No worksheets found in Excel file', {
          availableSheets: allSheetNames,
        });
      }

      // Parse the worksheets
      const allRecords: Record<string, any>[] = [];
      const sheetResults: Record<string, Record<string, any>[]> = {};

      for (const worksheet of sheetsToProcess) {
        const sheetRecords = this.parseWorksheet(worksheet, options);

        if (options.parseAllSheets) {
          // Store results by sheet name
          sheetResults[worksheet.name] = sheetRecords;

          if (options.mergeSheets) {
            // Add sheet name to each record and merge
            const recordsWithSheetName = sheetRecords.map(record => ({
              ...record,
              _sheetName: worksheet.name,
            }));
            allRecords.push(...recordsWithSheetName);
          }
        } else {
          // Just add the records
          allRecords.push(...sheetRecords);
        }
      }

      // Determine final records to return
      const records = options.parseAllSheets && !options.mergeSheets
        ? [] // Empty for multi-sheet results
        : allRecords;

      // Validate with schema if provided
      const validatedRecords = this.validateWithSchema(records, options.schema);

      // Log successful parsing
      logger.info({
        event: 'parsed_xlsx_records',
        file: options._fileName || 'unknown',
        sheets: sheetsToProcess.map(s => s.name),
        recordsCount: validatedRecords.length,
        timestamp: new Date().toISOString(),
      }, 'Parsed XLSX records');

      // Create and return the result
      return this.createResult(validatedRecords, {
        ...options,
        _metadata: {
          sheetNames: allSheetNames,
          processedSheets: sheetsToProcess.map(s => s.name),
          sheetResults: options.parseAllSheets && !options.mergeSheets ? sheetResults : undefined,
        },
      });
    } catch (error) {
      // Log error
      logger.error({
        event: 'xlsx_parser_error',
        file: options._fileName || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        parser: 'XLSXParser',
      });

      // Throw a ParseError with context
      throw new ParseError(
        `Failed to parse Excel content: ${error instanceof Error ? error.message : String(error)}`,
        {
          fileName: options._fileName,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          originalError: error,
        }
      );
    }
  }

  /**
   * Parse a worksheet into an array of records
   *
   * @param worksheet - ExcelJS worksheet
   * @param options - Parser options
   * @returns Array of records
   */
  private parseWorksheet(worksheet: ExcelJS.Worksheet, options: XLSXParserOptions): Record<string, any>[] {
    // Determine if we should use headers
    const useHeaders = options.headers !== false;

    // Determine header row
    const headerRow = options.headerRow || 1;

    // Get headers if needed
    let headers: string[] = [];

    if (useHeaders) {
      // If custom columns are provided, use those
      if (options.columns && options.columns.length > 0) {
        headers = options.columns;
      } else {
        // Extract headers from the header row
        const headerRowData = worksheet.getRow(headerRow);
        headers = [];

        headerRowData.eachCell({ includeEmpty: options.includeEmptyCells }, (cell, colNumber) => {
          headers[colNumber - 1] = cell.value ? String(cell.value).trim() : `Column${colNumber}`;
        });
      }
    }

    // Parse data rows
    const records: Record<string, any>[] = [];
    const startRow = useHeaders ? headerRow + 1 : headerRow;

    // Iterate through rows
    worksheet.eachRow({ includeEmpty: options.includeEmptyCells }, (row, rowNumber) => {
      // Skip header row if using headers
      if (useHeaders && rowNumber < startRow) {
        return;
      }

      const record: Record<string, any> = {};

      // Process each cell in the row
      row.eachCell({ includeEmpty: options.includeEmptyCells }, (cell, colNumber) => {
        const columnName = useHeaders ? headers[colNumber - 1] || `Column${colNumber}` : `Column${colNumber}`;
        let value = cell.value;

        // Handle different cell types
        if (cell.type === ExcelJS.ValueType.Date) {
          value = cell.value;
        } else if (cell.type === ExcelJS.ValueType.Hyperlink && typeof cell.value === 'object') {
          value = cell.value.text || cell.value.address || '';
        } else if (cell.type === ExcelJS.ValueType.RichText && typeof cell.value === 'object') {
          value = cell.text || '';
        } else if (cell.type === ExcelJS.ValueType.Formula) {
          value = cell.result || '';
        }

        // Trim string values if requested
        if (typeof value === 'string' && options.trim !== false) {
          value = value.trim();
        }

        record[columnName] = value;
      });

      records.push(record);
    });

    return records;
  }
}
