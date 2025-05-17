/**
 * Tests for XLSXParser
 */

import ExcelJS from 'exceljs';
import { XLSXParser, XLSXParserOptions } from '../../parsers/XLSXParser.js';
import { FileType } from '../../interfaces/Parser.js';
import { ParseError } from '../../parsers/errors/ParserError.js';
import { z } from 'zod';

// Mock dependencies
jest.mock('exceljs', () => {
  // Mock Worksheet class
  class MockWorksheet {
    name: string;
    
    constructor(name: string) {
      this.name = name;
    }
    
    getRow(rowNumber: number) {
      return {
        eachCell: jest.fn((options, callback) => {
          // Mock header cells
          if (rowNumber === 1) {
            callback({ value: 'name', type: 0 }, 1);
            callback({ value: 'age', type: 0 }, 2);
          }
        }),
      };
    }
    
    eachRow(options: any, callback: any) {
      // Mock data rows
      callback({
        eachCell: (options: any, callback: any) => {
          callback({ value: 'John', type: 0 }, 1);
          callback({ value: 30, type: 0 }, 2);
        },
      }, 1); // Header row
      
      callback({
        eachCell: (options: any, callback: any) => {
          callback({ value: 'Jane', type: 0 }, 1);
          callback({ value: 25, type: 0 }, 2);
        },
      }, 2); // Data row
    }
  }
  
  // Mock Workbook class
  return {
    Workbook: jest.fn().mockImplementation(() => ({
      xlsx: {
        load: jest.fn().mockResolvedValue(undefined),
      },
      worksheets: [
        new MockWorksheet('Sheet1'),
        new MockWorksheet('Sheet2'),
      ],
      getWorksheet: jest.fn((name) => {
        if (name === 'Sheet1') return new MockWorksheet('Sheet1');
        if (name === 'Sheet2') return new MockWorksheet('Sheet2');
        return null;
      }),
    })),
    ValueType: {
      Date: 3,
      Hyperlink: 4,
      RichText: 5,
      Formula: 6,
    },
  };
});

jest.mock('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('XLSXParser', () => {
  let parser: XLSXParser;
  
  beforeEach(() => {
    jest.clearAllMocks();
    parser = new XLSXParser();
  });
  
  describe('constructor', () => {
    it('should initialize with XLSX and XLS file types', () => {
      expect(parser.getSupportedFileTypes()).toEqual([FileType.XLSX, FileType.XLS]);
      expect(parser.canParse(FileType.XLSX)).toBe(true);
      expect(parser.canParse(FileType.XLS)).toBe(true);
      expect(parser.canParse(FileType.CSV)).toBe(false);
    });
  });
  
  describe('parseContent', () => {
    it('should parse Excel content successfully', async () => {
      const content = Buffer.from('mock excel content');
      const options: XLSXParserOptions = {};
      
      const result = await parser.parseContent(content, options);
      
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(1); // One data row (excluding header)
      expect(result.records[0]).toEqual({ name: 'Jane', age: 25 });
      expect(result.metadata.sheetNames).toEqual(['Sheet1', 'Sheet2']);
      expect(result.metadata.processedSheets).toEqual(['Sheet1']);
    });
    
    it('should handle string input by converting to Buffer', async () => {
      const content = 'mock excel content';
      
      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(1);
    });
    
    it('should use specified sheet name if provided', async () => {
      const content = Buffer.from('mock excel content');
      const options: XLSXParserOptions = {
        sheetNames: ['Sheet2'],
      };
      
      const result = await parser.parseContent(content, options);
      
      expect(result.metadata.processedSheets).toEqual(['Sheet2']);
    });
    
    it('should use specified sheet index if provided', async () => {
      const content = Buffer.from('mock excel content');
      const options: XLSXParserOptions = {
        sheetIndex: 1,
      };
      
      const result = await parser.parseContent(content, options);
      
      expect(result.metadata.processedSheets).toEqual(['Sheet2']);
    });
    
    it('should process all sheets if parseAllSheets is true', async () => {
      const content = Buffer.from('mock excel content');
      const options: XLSXParserOptions = {
        parseAllSheets: true,
      };
      
      const result = await parser.parseContent(content, options);
      
      expect(result.metadata.processedSheets).toEqual(['Sheet1', 'Sheet2']);
      // Since mergeSheets is not set, records should be empty
      expect(result.records).toEqual([]);
      expect(result.metadata.sheetResults).toBeDefined();
      expect(Object.keys(result.metadata.sheetResults!)).toEqual(['Sheet1', 'Sheet2']);
    });
    
    it('should merge sheets if parseAllSheets and mergeSheets are true', async () => {
      const content = Buffer.from('mock excel content');
      const options: XLSXParserOptions = {
        parseAllSheets: true,
        mergeSheets: true,
      };
      
      const result = await parser.parseContent(content, options);
      
      expect(result.metadata.processedSheets).toEqual(['Sheet1', 'Sheet2']);
      // Should have 2 records (1 from each sheet)
      expect(result.records).toHaveLength(2);
      expect(result.records[0]._sheetName).toBe('Sheet1');
      expect(result.records[1]._sheetName).toBe('Sheet2');
    });
    
    it('should apply schema validation if provided', async () => {
      const content = Buffer.from('mock excel content');
      
      // Create a schema that converts age to number
      const TestSchema = z.object({
        name: z.string(),
        age: z.number(),
      });
      
      // Mock the validateWithSchema method
      const validateSpy = jest.spyOn(parser as any, 'validateWithSchema');
      validateSpy.mockImplementation((records) => records);
      
      const result = await parser.parseContent(content, { schema: TestSchema });
      
      expect(validateSpy).toHaveBeenCalled();
    });
    
    it('should throw ParseError if no worksheets are found', async () => {
      const content = Buffer.from('mock excel content');
      
      // Mock getWorksheet to return null for all sheets
      const workbookMock = new (ExcelJS.Workbook as any)();
      workbookMock.worksheets = [];
      workbookMock.getWorksheet.mockReturnValue(null);
      
      // Mock the Workbook constructor
      (ExcelJS.Workbook as jest.Mock).mockImplementation(() => workbookMock);
      
      await expect(parser.parseContent(content)).rejects.toThrow(ParseError);
      await expect(parser.parseContent(content)).rejects.toThrow('No worksheets found in Excel file');
    });
    
    it('should throw ParseError on Excel loading failure', async () => {
      const content = Buffer.from('mock excel content');
      
      // Mock xlsx.load to throw an error
      const workbookMock = new (ExcelJS.Workbook as any)();
      workbookMock.xlsx.load.mockRejectedValue(new Error('Failed to load Excel file'));
      
      // Mock the Workbook constructor
      (ExcelJS.Workbook as jest.Mock).mockImplementation(() => workbookMock);
      
      await expect(parser.parseContent(content)).rejects.toThrow(ParseError);
      await expect(parser.parseContent(content)).rejects.toThrow('Failed to parse Excel content: Failed to load Excel file');
    });
  });
});
