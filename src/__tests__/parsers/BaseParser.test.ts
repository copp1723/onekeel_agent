/**
 * Tests for BaseParser
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { BaseParser } from '../../parsers/BaseParser.js';
import { FileType, ParserOptions, ParserResult } from '../../interfaces/Parser.js';
import { 
  FileNotFoundError, 
  UnsupportedFileTypeError, 
  ValidationError 
} from '../../parsers/errors/ParserError.js';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create a concrete implementation of BaseParser for testing
class TestParser extends BaseParser {
  constructor(fileTypes: FileType[] = [FileType.CSV]) {
    super(fileTypes);
  }
  
  public async parseContent(content: string | Buffer, options?: ParserOptions): Promise<ParserResult> {
    // Simple implementation that just returns the content as a single record
    const records = [{ content: content.toString() }];
    return this.createResult(records, options);
  }
}

describe('BaseParser', () => {
  let parser: TestParser;
  
  beforeEach(() => {
    jest.clearAllMocks();
    parser = new TestParser([FileType.CSV, FileType.JSON]);
    
    // Default mock implementations
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('test content');
  });
  
  describe('constructor', () => {
    it('should initialize with supported file types', () => {
      expect(parser.getSupportedFileTypes()).toEqual([FileType.CSV, FileType.JSON]);
    });
  });
  
  describe('canParse', () => {
    it('should return true for supported file types', () => {
      expect(parser.canParse(FileType.CSV)).toBe(true);
      expect(parser.canParse(FileType.JSON)).toBe(true);
    });
    
    it('should return false for unsupported file types', () => {
      expect(parser.canParse(FileType.PDF)).toBe(false);
      expect(parser.canParse(FileType.XLSX)).toBe(false);
    });
  });
  
  describe('parseFile', () => {
    it('should successfully parse a file', async () => {
      const filePath = 'test.csv';
      const result = await parser.parseFile(filePath);
      
      expect(result.success).toBe(true);
      expect(result.records).toEqual([{ content: 'test content' }]);
      expect(result.recordCount).toBe(1);
      expect(result.metadata.fileType).toBe(FileType.CSV);
      expect(result.metadata.fileName).toBe('test.csv');
    });
    
    it('should throw FileNotFoundError if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const filePath = 'nonexistent.csv';
      
      const result = await parser.parseFile(filePath);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.records).toEqual([]);
      expect(result.recordCount).toBe(0);
    });
    
    it('should throw UnsupportedFileTypeError for unsupported file types', async () => {
      const filePath = 'test.pdf';
      
      const result = await parser.parseFile(filePath);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.records).toEqual([]);
      expect(result.recordCount).toBe(0);
    });
    
    it('should include vendor and reportType in metadata if provided', async () => {
      const filePath = 'test.csv';
      const options = {
        vendor: 'TestVendor',
        reportType: 'SalesReport',
      };
      
      const result = await parser.parseFile(filePath, options);
      
      expect(result.metadata.vendor).toBe('TestVendor');
      expect(result.metadata.reportType).toBe('SalesReport');
    });
  });
  
  describe('validateWithSchema', () => {
    // Create a test schema
    const TestSchema = z.object({
      name: z.string(),
      age: z.number(),
    });
    
    // Access the protected method using type assertion
    const validateWithSchema = (records: Record<string, any>[], schema?: z.ZodType) => {
      return (parser as any).validateWithSchema(records, schema);
    };
    
    it('should return records unchanged if no schema is provided', () => {
      const records = [{ name: 'John', age: 30 }];
      const result = validateWithSchema(records);
      
      expect(result).toEqual(records);
    });
    
    it('should validate records against the schema', () => {
      const records = [{ name: 'John', age: 30 }];
      const result = validateWithSchema(records, TestSchema);
      
      expect(result).toEqual(records);
    });
    
    it('should throw ValidationError if validation fails', () => {
      const records = [{ name: 'John', age: 'thirty' }];
      
      expect(() => validateWithSchema(records, TestSchema)).toThrow(ValidationError);
    });
  });
  
  describe('createResult', () => {
    // Access the protected method using type assertion
    const createResult = (records: Record<string, any>[], options?: any) => {
      return (parser as any).createResult(records, options);
    };
    
    it('should create a result with default values', () => {
      const records = [{ name: 'John' }];
      const result = createResult(records);
      
      expect(result.id).toBeDefined();
      expect(result.records).toEqual(records);
      expect(result.recordCount).toBe(1);
      expect(result.success).toBe(true);
      expect(result.metadata.fileType).toBe(FileType.UNKNOWN);
      expect(result.metadata.fileName).toBe('unknown');
      expect(result.metadata.parseDate).toBeDefined();
    });
    
    it('should include file metadata if provided', () => {
      const records = [{ name: 'John' }];
      const options = {
        _fileType: FileType.CSV,
        _fileName: 'test.csv',
      };
      
      const result = createResult(records, options);
      
      expect(result.metadata.fileType).toBe(FileType.CSV);
      expect(result.metadata.fileName).toBe('test.csv');
    });
    
    it('should include additional metadata if provided', () => {
      const records = [{ name: 'John' }];
      const options = {
        _metadata: {
          customField: 'customValue',
        },
      };
      
      const result = createResult(records, options);
      
      expect(result.metadata.customField).toBe('customValue');
    });
  });
});
