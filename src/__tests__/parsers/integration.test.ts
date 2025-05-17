/**
 * Integration Tests for Unified Parser Interface
 */

import fs from 'fs';
import path from 'path';
import { 
  FileType, 
  ParserFactory, 
  parseFile, 
  getParser, 
  getParserForFile,
  CSVParser,
  XLSXParser,
  PDFParser,
} from '../../parsers/index.js';
import { ParseError } from '../../parsers/errors/ParserError.js';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn(),
}));

// Mock dependencies for each parser
jest.mock('csv-parse/sync', () => ({
  parse: jest.fn().mockReturnValue([
    { name: 'John', age: '30' },
    { name: 'Jane', age: '25' },
  ]),
}));

jest.mock('exceljs', () => {
  // Mock Worksheet class
  class MockWorksheet {
    name: string;
    
    constructor(name: string) {
      this.name = name;
    }
    
    getRow() {
      return {
        eachCell: jest.fn((options, callback) => {
          callback({ value: 'name', type: 0 }, 1);
          callback({ value: 'age', type: 0 }, 2);
        }),
      };
    }
    
    eachRow(options: any, callback: any) {
      callback({
        eachCell: (options: any, callback: any) => {
          callback({ value: 'John', type: 0 }, 1);
          callback({ value: 30, type: 0 }, 2);
        },
      }, 1);
      
      callback({
        eachCell: (options: any, callback: any) => {
          callback({ value: 'Jane', type: 0 }, 1);
          callback({ value: 25, type: 0 }, 2);
        },
      }, 2);
    }
  }
  
  return {
    Workbook: jest.fn().mockImplementation(() => ({
      xlsx: {
        load: jest.fn().mockResolvedValue(undefined),
      },
      worksheets: [
        new MockWorksheet('Sheet1'),
      ],
      getWorksheet: jest.fn(() => new MockWorksheet('Sheet1')),
    })),
    ValueType: {
      Date: 3,
      Hyperlink: 4,
      RichText: 5,
      Formula: 6,
    },
  };
});

jest.mock('pdf-parse', () => {
  return jest.fn().mockResolvedValue({
    numpages: 2,
    numrender: 2,
    info: { Title: 'Test PDF' },
    metadata: null,
    text: 'Header1 Header2\nValue1 Value2\nValue3 Value4',
    version: '1.10.100',
  });
});

jest.mock('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Unified Parser Interface Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
      if (typeof filePath === 'string') {
        if (filePath.endsWith('.csv')) {
          return 'name,age\nJohn,30\nJane,25';
        } else if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
          return Buffer.from('mock excel content');
        } else if (filePath.endsWith('.pdf')) {
          return Buffer.from('mock pdf content');
        }
      }
      return 'unknown content';
    });
  });
  
  describe('ParserFactory', () => {
    it('should have all parsers registered', () => {
      expect(ParserFactory.hasParserForType(FileType.CSV)).toBe(true);
      expect(ParserFactory.hasParserForType(FileType.XLSX)).toBe(true);
      expect(ParserFactory.hasParserForType(FileType.XLS)).toBe(true);
      expect(ParserFactory.hasParserForType(FileType.PDF)).toBe(true);
      expect(ParserFactory.hasParserForType(FileType.UNKNOWN)).toBe(false);
    });
    
    it('should create the correct parser for each file type', () => {
      expect(ParserFactory.createParser(FileType.CSV)).toBeInstanceOf(CSVParser);
      expect(ParserFactory.createParser(FileType.XLSX)).toBeInstanceOf(XLSXParser);
      expect(ParserFactory.createParser(FileType.XLS)).toBeInstanceOf(XLSXParser);
      expect(ParserFactory.createParser(FileType.PDF)).toBeInstanceOf(PDFParser);
      expect(() => ParserFactory.createParser(FileType.UNKNOWN)).toThrow();
    });
    
    it('should create the correct parser for each file extension', () => {
      expect(ParserFactory.createParserForFile('test.csv')).toBeInstanceOf(CSVParser);
      expect(ParserFactory.createParserForFile('test.xlsx')).toBeInstanceOf(XLSXParser);
      expect(ParserFactory.createParserForFile('test.xls')).toBeInstanceOf(XLSXParser);
      expect(ParserFactory.createParserForFile('test.pdf')).toBeInstanceOf(PDFParser);
      expect(() => ParserFactory.createParserForFile('test.txt')).toThrow();
    });
  });
  
  describe('parseFile function', () => {
    it('should parse CSV files', async () => {
      const result = await parseFile('test.csv');
      
      expect(result.success).toBe(true);
      expect(result.records).toEqual([
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]);
      expect(result.metadata.fileType).toBe(FileType.CSV);
    });
    
    it('should parse XLSX files', async () => {
      const result = await parseFile('test.xlsx');
      
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(1); // One data row (excluding header)
      expect(result.metadata.fileType).toBe(FileType.XLSX);
    });
    
    it('should parse PDF files', async () => {
      const result = await parseFile('test.pdf');
      
      expect(result.success).toBe(true);
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.metadata.fileType).toBe(FileType.PDF);
    });
    
    it('should throw for unsupported file types', async () => {
      await expect(parseFile('test.txt')).rejects.toThrow();
    });
    
    it('should pass options to the parser', async () => {
      const options = {
        vendor: 'TestVendor',
        reportType: 'SalesReport',
      };
      
      const result = await parseFile('test.csv', options);
      
      expect(result.metadata.vendor).toBe('TestVendor');
      expect(result.metadata.reportType).toBe('SalesReport');
    });
  });
  
  describe('getParser and getParserForFile functions', () => {
    it('should return the correct parser instance', () => {
      expect(getParser(FileType.CSV)).toBeInstanceOf(CSVParser);
      expect(getParserForFile('test.xlsx')).toBeInstanceOf(XLSXParser);
    });
    
    it('should throw for unsupported file types', () => {
      expect(() => getParser(FileType.UNKNOWN)).toThrow();
      expect(() => getParserForFile('test.txt')).toThrow();
    });
  });
  
  describe('Error handling', () => {
    it('should handle file not found errors', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      
      await expect(parseFile('nonexistent.csv')).rejects.toThrow();
    });
    
    it('should handle parsing errors', async () => {
      // Mock CSV parse to throw an error
      const csvParseMock = require('csv-parse/sync').parse as jest.Mock;
      csvParseMock.mockImplementationOnce(() => {
        throw new Error('CSV parsing failed');
      });
      
      await expect(parseFile('test.csv')).rejects.toThrow(ParseError);
    });
  });
});
