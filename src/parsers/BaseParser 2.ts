/**
 * Base Parser
 *
 * Abstract base class for all file parsers.
 * Provides common functionality and defines the structure for specific parser implementations.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import logger from '../utils/logger.js';
import { getErrorMessage } from '../utils/errorUtils.js';
import { FileType, IParser, ParserOptions, ParserResult } from '../interfaces/Parser.js';
import {
  FileNotFoundError,
  UnsupportedFileTypeError,
  ValidationError
} from './errors/ParserError.js';

/**
 * Abstract base class for all parsers
 */
export abstract class BaseParser implements IParser {
  /**
   * File types supported by this parser
   */
  protected supportedFileTypes: FileType[] = [];

  /**
   * Constructor for the base parser
   *
   * @param fileTypes - Array of file types supported by this parser
   */
  constructor(fileTypes: FileType[]) {
    this.supportedFileTypes = fileTypes;
  }

  /**
   * Parse a file from a file path
   *
   * @param filePath - Path to the file to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseFile(filePath: string, options: ParserOptions = {}): Promise<ParserResult> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new FileNotFoundError(filePath);
      }

      // Detect file type
      const fileType = this.detectFileType(filePath);

      // Check if this parser supports the file type
      if (!this.canParse(fileType)) {
        throw new UnsupportedFileTypeError(fileType.toString(), {
          supportedTypes: this.getSupportedFileTypes()
        });
      }

      // Read file content
      const content = this.readFileContent(filePath);

      // Parse content with file metadata
      const result = await this.parseContent(content, {
        ...options,
        _filePath: filePath,
        _fileName: path.basename(filePath),
        _fileType: fileType,
      });

      return result;
    } catch (error) {
      logger.error({
        event: 'parser_error',
        file: path.basename(filePath),
        error: getErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined,
        parser: this.constructor.name,
      });

      // Return error result
      return {
        id: uuidv4(),
        records: [],
        recordCount: 0,
        success: false,
        metadata: {
          fileType: this.detectFileType(filePath),
          fileName: path.basename(filePath),
          parseDate: new Date().toISOString(),
          error: getErrorMessage(error),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Parse content directly
   * This method must be implemented by subclasses
   *
   * @param content - Content to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public abstract parseContent(content: string | Buffer, options?: ParserOptions): Promise<ParserResult>;

  /**
   * Check if this parser can handle the given file type
   *
   * @param fileType - Type of file to check
   * @returns True if this parser can handle the file type
   */
  public canParse(fileType: FileType): boolean {
    return this.supportedFileTypes.includes(fileType);
  }

  /**
   * Get the file types supported by this parser
   *
   * @returns Array of supported file types
   */
  public getSupportedFileTypes(): FileType[] {
    return [...this.supportedFileTypes];
  }

  /**
   * Detect the type of a file based on its extension
   *
   * @param filePath - Path to the file
   * @returns Detected file type
   */
  protected detectFileType(filePath: string): FileType {
    const extension = path.extname(filePath).toLowerCase().replace('.', '');

    switch (extension) {
      case 'csv':
        return FileType.CSV;
      case 'xlsx':
        return FileType.XLSX;
      case 'xls':
        return FileType.XLS;
      case 'pdf':
        return FileType.PDF;
      case 'json':
        return FileType.JSON;
      default:
        return FileType.UNKNOWN;
    }
  }

  /**
   * Read content from a file
   *
   * @param filePath - Path to the file
   * @returns File content as string or Buffer
   */
  protected readFileContent(filePath: string): string | Buffer {
    const fileType = this.detectFileType(filePath);

    // For binary files, return a Buffer
    if (fileType === FileType.PDF || fileType === FileType.XLSX || fileType === FileType.XLS) {
      return fs.readFileSync(filePath);
    }

    // For text files, return a string
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Apply schema validation to parsed records
   *
   * @param records - Records to validate
   * @param schema - Zod schema to apply
   * @returns Validated records
   * @throws ValidationError if validation fails
   */
  protected validateWithSchema(records: Record<string, any>[], schema?: z.ZodType): Record<string, any>[] {
    if (!schema) {
      return records;
    }

    try {
      const arraySchema = z.array(schema);
      return arraySchema.parse(records);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Schema validation failed', {
          zodErrors: error.errors,
          recordCount: records.length,
        });
      }
      throw error;
    }
  }

  /**
   * Create a standard parser result
   *
   * @param records - Parsed records
   * @param options - Parser options
   * @returns Standard parser result
   */
  protected createResult(
    records: Record<string, any>[],
    options: ParserOptions & {
      _filePath?: string;
      _fileName?: string;
      _fileType?: FileType;
      _metadata?: Record<string, any>;
    } = {}
  ): ParserResult {
    const fileType = options._fileType || FileType.UNKNOWN;
    const fileName = options._fileName || 'unknown';

    const metadata: ParserResult['metadata'] = {
      fileType,
      fileName,
      parseDate: new Date().toISOString(),
      ...(options.vendor ? { vendor: options.vendor } : {}),
      ...(options.reportType ? { reportType: options.reportType } : {}),
      ...(options._metadata || {}),
    };

    return {
      id: uuidv4(),
      records,
      recordCount: records.length,
      metadata,
      success: true,
    };
  }
}
