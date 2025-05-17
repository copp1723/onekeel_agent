/**
 * Parser Factory
 * 
 * Factory class for creating parser instances.
 * Provides a central registry for parser implementations and methods to create parsers.
 */

import path from 'path';
import { FileType, IParser } from '../interfaces/Parser.js';
import { UnsupportedFileTypeError } from './errors/ParserError.js';

/**
 * Factory for creating parser instances
 */
export class ParserFactory {
  /**
   * Registry of parser classes by file type
   */
  private static parsers: Map<FileType, new () => IParser> = new Map();
  
  /**
   * Register a parser class for a file type
   * 
   * @param fileType - File type to register the parser for
   * @param parserClass - Parser class constructor
   */
  public static registerParser(fileType: FileType, parserClass: new () => IParser): void {
    ParserFactory.parsers.set(fileType, parserClass);
  }
  
  /**
   * Create a parser instance for a specific file type
   * 
   * @param fileType - File type to create a parser for
   * @returns Parser instance
   * @throws UnsupportedFileTypeError if no parser is registered for the file type
   */
  public static createParser(fileType: FileType): IParser {
    const ParserClass = ParserFactory.parsers.get(fileType);
    if (!ParserClass) {
      throw new UnsupportedFileTypeError(fileType.toString(), {
        registeredTypes: Array.from(ParserFactory.parsers.keys()),
      });
    }
    return new ParserClass();
  }
  
  /**
   * Create a parser instance for a file based on its extension
   * 
   * @param filePath - Path to the file
   * @returns Parser instance
   * @throws UnsupportedFileTypeError if no parser is registered for the file type
   */
  public static createParserForFile(filePath: string): IParser {
    const fileType = ParserFactory.detectFileType(filePath);
    return ParserFactory.createParser(fileType);
  }
  
  /**
   * Get all registered file types
   * 
   * @returns Array of registered file types
   */
  public static getRegisteredFileTypes(): FileType[] {
    return Array.from(ParserFactory.parsers.keys());
  }
  
  /**
   * Check if a parser is registered for a file type
   * 
   * @param fileType - File type to check
   * @returns True if a parser is registered for the file type
   */
  public static hasParserForType(fileType: FileType): boolean {
    return ParserFactory.parsers.has(fileType);
  }
  
  /**
   * Detect the type of a file based on its extension
   * 
   * @param filePath - Path to the file
   * @returns Detected file type
   */
  public static detectFileType(filePath: string): FileType {
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
}
