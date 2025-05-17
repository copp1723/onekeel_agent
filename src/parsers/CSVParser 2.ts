/**
 * CSV Parser
 *
 * Implementation of the parser interface for CSV files.
 */

import { parse as csvParse } from 'csv-parse/sync';
import path from 'path';
import logger from '../utils/logger.js';
import { BaseParser } from './BaseParser.js';
import { FileType, ParserOptions, ParserResult } from '../interfaces/Parser.js';
import { ParseError } from './errors/ParserError.js';

/**
 * CSV-specific parser options
 */
export interface CSVParserOptions extends ParserOptions {
  /**
   * CSV delimiter character (default: ',')
   */
  delimiter?: string;

  /**
   * CSV quote character (default: '"')
   */
  quote?: string;

  /**
   * CSV escape character (default: '"')
   */
  escape?: string;

  /**
   * CSV comment character
   */
  comment?: string;

  /**
   * Whether to relax column count (default: false)
   */
  relax_column_count?: boolean;

  /**
   * Whether to skip empty lines (default: true)
   */
  skip_empty_lines?: boolean;

  /**
   * Whether to use the first row as headers (default: true)
   * Can also be an array of column names
   */
  columns?: boolean | string[];
}

/**
 * Parser implementation for CSV files
 */
export class CSVParser extends BaseParser {
  /**
   * Constructor for the CSV parser
   */
  constructor() {
    super([FileType.CSV]);
  }

  /**
   * Parse CSV content
   *
   * @param content - CSV content as string
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseContent(content: string | Buffer, options: CSVParserOptions = {}): Promise<ParserResult> {
    try {
      // Ensure content is a string
      const csvContent = content.toString('utf8');

      // Parse CSV with options
      const csvOptions = {
        columns: options.columns !== undefined ? options.columns : options.headers !== false,
        skip_empty_lines: options.skip_empty_lines !== undefined ? options.skip_empty_lines : options.skipEmptyLines !== false,
        trim: options.trim !== false,
        delimiter: options.delimiter || ',',
        quote: options.quote || '"',
        escape: options.escape || '"',
        comment: options.comment,
        relax_column_count: options.relax_column_count || false,
      };

      // Parse the CSV content
      const rawRecords = csvParse(csvContent, csvOptions);

      // Validate with schema if provided
      const records = this.validateWithSchema(rawRecords, options.schema);

      // Log successful parsing
      logger.info({
        event: 'parsed_csv_records',
        file: options._fileName || 'unknown',
        recordsCount: records.length,
        timestamp: new Date().toISOString(),
      }, 'Parsed CSV records');

      // Create and return the result
      return this.createResult(records, {
        ...options,
        _metadata: {
          delimiter: options.delimiter || ',',
          headerRow: options.columns !== false,
        },
      });
    } catch (error) {
      // Log error
      logger.error({
        event: 'csv_parser_error',
        file: options._fileName || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        parser: 'CSVParser',
      });

      // Throw a ParseError with context
      throw new ParseError(
        `Failed to parse CSV content: ${error instanceof Error ? error.message : String(error)}`,
        {
          fileName: options._fileName,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          originalError: error,
        }
      );
    }
  }
}
