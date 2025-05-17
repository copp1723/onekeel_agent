/**
 * Tests for CSVParser
 */

import { parse as csvParse } from 'csv-parse/sync';
import { CSVParser, CSVParserOptions } from '../../parsers/CSVParser.js';
import { FileType } from '../../interfaces/Parser.js';
import { ParseError } from '../../parsers/errors/ParserError.js';
import { z } from 'zod';

// Mock dependencies
jest.mock('csv-parse/sync', () => ({
  parse: jest.fn(),
}));

jest.mock('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CSVParser', () => {
  let parser: CSVParser;
  
  beforeEach(() => {
    jest.clearAllMocks();
    parser = new CSVParser();
    
    // Default mock implementation for csvParse
    (csvParse as jest.Mock).mockReturnValue([
      { name: 'John', age: '30' },
      { name: 'Jane', age: '25' },
    ]);
  });
  
  describe('constructor', () => {
    it('should initialize with CSV file type', () => {
      expect(parser.getSupportedFileTypes()).toEqual([FileType.CSV]);
      expect(parser.canParse(FileType.CSV)).toBe(true);
      expect(parser.canParse(FileType.XLSX)).toBe(false);
    });
  });
  
  describe('parseContent', () => {
    it('should parse CSV content successfully', async () => {
      const content = 'name,age\nJohn,30\nJane,25';
      const options: CSVParserOptions = {
        delimiter: ',',
      };
      
      const result = await parser.parseContent(content, options);
      
      expect(result.success).toBe(true);
      expect(result.records).toEqual([
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]);
      expect(result.recordCount).toBe(2);
      expect(result.metadata.fileType).toBe(FileType.UNKNOWN); // No file type provided in options
      expect(result.metadata.delimiter).toBe(',');
      expect(result.metadata.headerRow).toBe(true);
    });
    
    it('should handle Buffer input', async () => {
      const content = Buffer.from('name,age\nJohn,30\nJane,25');
      
      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.records).toEqual([
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]);
    });
    
    it('should pass correct options to csv-parse', async () => {
      const content = 'name,age\nJohn,30\nJane,25';
      const options: CSVParserOptions = {
        delimiter: ';',
        quote: "'",
        escape: '\\',
        comment: '#',
        relax_column_count: true,
        skip_empty_lines: false,
        columns: ['col1', 'col2'],
        trim: false,
      };
      
      await parser.parseContent(content, options);
      
      expect(csvParse).toHaveBeenCalledWith(content, {
        columns: ['col1', 'col2'],
        skip_empty_lines: false,
        trim: false,
        delimiter: ';',
        quote: "'",
        escape: '\\',
        comment: '#',
        relax_column_count: true,
      });
    });
    
    it('should apply schema validation if provided', async () => {
      const content = 'name,age\nJohn,30\nJane,25';
      
      // Create a schema that converts age to number
      const TestSchema = z.object({
        name: z.string(),
        age: z.string().transform(val => parseInt(val, 10)),
      });
      
      // Mock the validateWithSchema method
      const validateSpy = jest.spyOn(parser as any, 'validateWithSchema');
      validateSpy.mockImplementation((records, schema) => {
        return records.map(record => ({
          name: record.name,
          age: parseInt(record.age, 10),
        }));
      });
      
      const result = await parser.parseContent(content, { schema: TestSchema });
      
      expect(validateSpy).toHaveBeenCalled();
      expect(result.records).toEqual([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ]);
    });
    
    it('should throw ParseError on parsing failure', async () => {
      const content = 'invalid,csv,content';
      
      // Mock csvParse to throw an error
      (csvParse as jest.Mock).mockImplementation(() => {
        throw new Error('CSV parsing failed');
      });
      
      await expect(parser.parseContent(content)).rejects.toThrow(ParseError);
      await expect(parser.parseContent(content)).rejects.toThrow('Failed to parse CSV content: CSV parsing failed');
    });
    
    it('should include file metadata in the result if provided', async () => {
      const content = 'name,age\nJohn,30\nJane,25';
      const options: CSVParserOptions = {
        _fileName: 'test.csv',
        _fileType: FileType.CSV,
        vendor: 'TestVendor',
        reportType: 'SalesReport',
      };
      
      const result = await parser.parseContent(content, options);
      
      expect(result.metadata.fileName).toBe('test.csv');
      expect(result.metadata.fileType).toBe(FileType.CSV);
      expect(result.metadata.vendor).toBe('TestVendor');
      expect(result.metadata.reportType).toBe('SalesReport');
    });
  });
});
