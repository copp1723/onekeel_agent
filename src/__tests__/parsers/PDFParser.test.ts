/**
 * Tests for PDFParser
 */

import pdfParse from 'pdf-parse';
import { PDFParser, PDFParserOptions, PDFExtractionMode } from '../../parsers/PDFParser.js';
import { FileType } from '../../interfaces/Parser.js';
import { ParseError } from '../../parsers/errors/ParserError.js';
import { z } from 'zod';

// Mock dependencies
jest.mock('pdf-parse', () => {
  return jest.fn().mockResolvedValue({
    numpages: 2,
    numrender: 2,
    info: {
      PDFFormatVersion: '1.7',
      IsAcroFormPresent: false,
      IsXFAPresent: false,
      Title: 'Test PDF',
      Author: 'Test Author',
      Creator: 'Test Creator',
    },
    metadata: null,
    text: 'Header1 Header2 Header3\nValue1 Value2 Value3\nValue4 Value5 Value6\n\nSome other text\n\nTable1 Table2\nData1 Data2\nData3 Data4',
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

describe('PDFParser', () => {
  let parser: PDFParser;
  
  beforeEach(() => {
    jest.clearAllMocks();
    parser = new PDFParser();
  });
  
  describe('constructor', () => {
    it('should initialize with PDF file type', () => {
      expect(parser.getSupportedFileTypes()).toEqual([FileType.PDF]);
      expect(parser.canParse(FileType.PDF)).toBe(true);
      expect(parser.canParse(FileType.CSV)).toBe(false);
    });
  });
  
  describe('parseContent', () => {
    it('should parse PDF content successfully', async () => {
      const content = Buffer.from('mock pdf content');
      const options: PDFParserOptions = {};
      
      const result = await parser.parseContent(content, options);
      
      expect(result.success).toBe(true);
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.metadata.pageCount).toBe(2);
      expect(result.metadata.extractionMode).toBeDefined();
      expect(result.metadata.confidence).toBeDefined();
    });
    
    it('should handle string input by converting to Buffer', async () => {
      const content = 'mock pdf content';
      
      const result = await parser.parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.records.length).toBeGreaterThan(0);
    });
    
    it('should include text in metadata if requested', async () => {
      const content = Buffer.from('mock pdf content');
      const options: PDFParserOptions = {
        includeText: true,
      };
      
      const result = await parser.parseContent(content, options);
      
      expect(result.metadata.text).toBeDefined();
      expect(typeof result.metadata.text).toBe('string');
    });
    
    it('should not include text in metadata by default', async () => {
      const content = Buffer.from('mock pdf content');
      
      const result = await parser.parseContent(content);
      
      expect(result.metadata.text).toBeUndefined();
    });
    
    it('should use specified extraction mode if provided', async () => {
      const content = Buffer.from('mock pdf content');
      const options: PDFParserOptions = {
        extractionMode: PDFExtractionMode.STREAM,
      };
      
      const result = await parser.parseContent(content, options);
      
      expect(result.metadata.extractionMode).toBe(PDFExtractionMode.STREAM);
    });
    
    it('should not extract tables if extractTables is false', async () => {
      const content = Buffer.from('mock pdf content');
      const options: PDFParserOptions = {
        extractTables: false,
      };
      
      // Spy on the extractTablesFromPDF method
      const extractSpy = jest.spyOn(parser as any, 'extractTablesFromPDF');
      
      const result = await parser.parseContent(content, options);
      
      expect(extractSpy).not.toHaveBeenCalled();
      expect(result.records).toEqual([]);
    });
    
    it('should apply schema validation if provided', async () => {
      const content = Buffer.from('mock pdf content');
      
      // Create a schema
      const TestSchema = z.object({
        Header1: z.string(),
        Header2: z.string(),
        Header3: z.string(),
      });
      
      // Mock the validateWithSchema method
      const validateSpy = jest.spyOn(parser as any, 'validateWithSchema');
      validateSpy.mockImplementation((records) => records);
      
      const result = await parser.parseContent(content, { schema: TestSchema });
      
      expect(validateSpy).toHaveBeenCalled();
    });
    
    it('should throw ParseError on PDF parsing failure', async () => {
      const content = Buffer.from('mock pdf content');
      
      // Mock pdfParse to throw an error
      (pdfParse as jest.Mock).mockRejectedValueOnce(new Error('Failed to parse PDF'));
      
      await expect(parser.parseContent(content)).rejects.toThrow(ParseError);
      await expect(parser.parseContent(content)).rejects.toThrow('Failed to parse PDF content: Failed to parse PDF');
    });
    
    it('should include file metadata in the result if provided', async () => {
      const content = Buffer.from('mock pdf content');
      const options: PDFParserOptions = {
        _fileName: 'test.pdf',
        _fileType: FileType.PDF,
        vendor: 'TestVendor',
        reportType: 'SalesReport',
      };
      
      const result = await parser.parseContent(content, options);
      
      expect(result.metadata.fileName).toBe('test.pdf');
      expect(result.metadata.fileType).toBe(FileType.PDF);
      expect(result.metadata.vendor).toBe('TestVendor');
      expect(result.metadata.reportType).toBe('SalesReport');
    });
  });
  
  describe('extractTablesFromPDF', () => {
    it('should extract tables in lattice mode', async () => {
      const text = 'Header1 Header2 Header3\nValue1 Value2 Value3\nValue4 Value5 Value6';
      
      // Access the private method using type assertion
      const extractTablesFromPDF = (parser as any).extractTablesFromPDF.bind(parser);
      
      const result = await extractTablesFromPDF(text, PDFExtractionMode.LATTICE, {});
      
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.mode).toBe(PDFExtractionMode.LATTICE);
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should extract tables in stream mode', async () => {
      const text = 'Header1 Header2\nValue1 Value2\nValue3 Value4';
      
      // Access the private method using type assertion
      const extractTablesFromPDF = (parser as any).extractTablesFromPDF.bind(parser);
      
      const result = await extractTablesFromPDF(text, PDFExtractionMode.STREAM, {});
      
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.mode).toBe(PDFExtractionMode.STREAM);
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should try both modes in auto mode', async () => {
      const text = 'Header1 Header2\nValue1 Value2\nValue3 Value4';
      
      // Access the private method using type assertion
      const extractTablesFromPDF = (parser as any).extractTablesFromPDF.bind(parser);
      
      // Spy on the extraction methods
      const latticeSpy = jest.spyOn(parser as any, 'extractLatticeMode');
      const streamSpy = jest.spyOn(parser as any, 'extractStreamMode');
      
      const result = await extractTablesFromPDF(text, PDFExtractionMode.AUTO, {});
      
      expect(latticeSpy).toHaveBeenCalled();
      expect(streamSpy).toHaveBeenCalled();
      expect(result.records.length).toBeGreaterThan(0);
    });
  });
});
