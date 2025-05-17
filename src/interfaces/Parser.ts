/**
 * Parser Interface
 *
 * Defines the common interface for all file parsers in the system.
 * This provides a unified way to parse different file types with consistent
 * options and return types.
 */

import { z } from 'zod';

/**
 * Supported file types for parsing
 */
export enum FileType {
  CSV = 'csv',
  XLSX = 'xlsx',
  XLS = 'xls',
  PDF = 'pdf',
  JSON = 'json',
  UNKNOWN = 'unknown',
}

/**
 * Common parser options that apply to all parser types
 */
export interface ParserOptions {
  /**
   * Optional Zod schema for validating parsed data
   */
  schema?: z.ZodType;

  /**
   * Vendor information for the file being parsed
   */
  vendor?: string;

  /**
   * Report type information for the file being parsed
   */
  reportType?: string;

  /**
   * Whether to trim whitespace from string values (default: true)
   */
  trim?: boolean;

  /**
   * Whether to skip empty lines (default: true)
   */
  skipEmptyLines?: boolean;

  /**
   * Whether to use the first row as headers (default: true)
   */
  headers?: boolean;

  /**
   * Custom column names to use instead of headers
   */
  columns?: string[];

  /**
   * Additional parser-specific options
   */
  [key: string]: any;
}

/**
 * Metadata about the parsed file
 */
export interface ParserMetadata {
  /**
   * Type of the file that was parsed
   */
  fileType: FileType;

  /**
   * Name of the file that was parsed
   */
  fileName: string;

  /**
   * Date when the file was parsed
   */
  parseDate: string;

  /**
   * Vendor information for the file
   */
  vendor?: string;

  /**
   * Report type information for the file
   */
  reportType?: string;

  /**
   * Additional metadata specific to the file type
   */
  [key: string]: any;
}

/**
 * Result of parsing a file
 */
export interface ParserResult {
  /**
   * Unique identifier for the parsing result
   */
  id: string;

  /**
   * Array of records parsed from the file
   */
  records: Record<string, any>[];

  /**
   * Number of records parsed from the file
   */
  recordCount: number;

  /**
   * Metadata about the parsed file
   */
  metadata: ParserMetadata;

  /**
   * Error information if parsing failed
   */
  error?: string;

  /**
   * Whether the parsing was successful
   */
  success: boolean;
}

/**
 * Interface for all file parsers
 */
export interface IParser {
  /**
   * Parse a file from a file path
   *
   * @param filePath - Path to the file to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  parseFile(filePath: string, options?: ParserOptions): Promise<ParserResult>;

  /**
   * Parse content directly (e.g., string for CSV, Buffer for PDF)
   *
   * @param content - Content to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  parseContent(content: string | Buffer, options?: ParserOptions): Promise<ParserResult>;

  /**
   * Check if this parser can handle the given file type
   *
   * @param fileType - Type of file to check
   * @returns True if this parser can handle the file type
   */
  canParse(fileType: FileType): boolean;

  /**
   * Get the file types supported by this parser
   *
   * @returns Array of supported file types
   */
  getSupportedFileTypes(): FileType[];
}
