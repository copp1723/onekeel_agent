/**
 * Tests for ParserFactory
 */

import { FileType, IParser } from '../../interfaces/Parser.js';
import { ParserFactory } from '../../parsers/ParserFactory.js';
import { UnsupportedFileTypeError } from '../../parsers/errors/ParserError.js';

// Create mock parser classes
class MockCSVParser implements IParser {
  parseFile = jest.fn();
  parseContent = jest.fn();
  canParse = jest.fn().mockReturnValue(true);
  getSupportedFileTypes = jest.fn().mockReturnValue([FileType.CSV]);
}

class MockXLSXParser implements IParser {
  parseFile = jest.fn();
  parseContent = jest.fn();
  canParse = jest.fn().mockReturnValue(true);
  getSupportedFileTypes = jest.fn().mockReturnValue([FileType.XLSX, FileType.XLS]);
}

describe('ParserFactory', () => {
  beforeEach(() => {
    // Clear the parser registry before each test
    // This is a bit of a hack since we're accessing a private static property
    (ParserFactory as any).parsers = new Map();
  });
  
  describe('registerParser', () => {
    it('should register a parser for a file type', () => {
      ParserFactory.registerParser(FileType.CSV, MockCSVParser);
      
      expect(ParserFactory.hasParserForType(FileType.CSV)).toBe(true);
    });
    
    it('should override an existing parser registration', () => {
      ParserFactory.registerParser(FileType.CSV, MockCSVParser);
      ParserFactory.registerParser(FileType.CSV, MockXLSXParser);
      
      const parser = ParserFactory.createParser(FileType.CSV);
      expect(parser).toBeInstanceOf(MockXLSXParser);
    });
  });
  
  describe('createParser', () => {
    it('should create a parser instance for a registered file type', () => {
      ParserFactory.registerParser(FileType.CSV, MockCSVParser);
      
      const parser = ParserFactory.createParser(FileType.CSV);
      
      expect(parser).toBeInstanceOf(MockCSVParser);
    });
    
    it('should throw UnsupportedFileTypeError for unregistered file types', () => {
      expect(() => ParserFactory.createParser(FileType.PDF)).toThrow(UnsupportedFileTypeError);
    });
  });
  
  describe('createParserForFile', () => {
    it('should create a parser based on file extension', () => {
      ParserFactory.registerParser(FileType.CSV, MockCSVParser);
      
      const parser = ParserFactory.createParserForFile('test.csv');
      
      expect(parser).toBeInstanceOf(MockCSVParser);
    });
    
    it('should throw UnsupportedFileTypeError for unsupported file extensions', () => {
      expect(() => ParserFactory.createParserForFile('test.pdf')).toThrow(UnsupportedFileTypeError);
    });
  });
  
  describe('getRegisteredFileTypes', () => {
    it('should return all registered file types', () => {
      ParserFactory.registerParser(FileType.CSV, MockCSVParser);
      ParserFactory.registerParser(FileType.XLSX, MockXLSXParser);
      ParserFactory.registerParser(FileType.XLS, MockXLSXParser);
      
      const types = ParserFactory.getRegisteredFileTypes();
      
      expect(types).toContain(FileType.CSV);
      expect(types).toContain(FileType.XLSX);
      expect(types).toContain(FileType.XLS);
      expect(types.length).toBe(3);
    });
    
    it('should return an empty array if no parsers are registered', () => {
      const types = ParserFactory.getRegisteredFileTypes();
      
      expect(types).toEqual([]);
    });
  });
  
  describe('hasParserForType', () => {
    it('should return true for registered file types', () => {
      ParserFactory.registerParser(FileType.CSV, MockCSVParser);
      
      expect(ParserFactory.hasParserForType(FileType.CSV)).toBe(true);
    });
    
    it('should return false for unregistered file types', () => {
      expect(ParserFactory.hasParserForType(FileType.PDF)).toBe(false);
    });
  });
  
  describe('detectFileType', () => {
    it('should detect CSV files', () => {
      expect(ParserFactory.detectFileType('test.csv')).toBe(FileType.CSV);
    });
    
    it('should detect XLSX files', () => {
      expect(ParserFactory.detectFileType('test.xlsx')).toBe(FileType.XLSX);
    });
    
    it('should detect XLS files', () => {
      expect(ParserFactory.detectFileType('test.xls')).toBe(FileType.XLS);
    });
    
    it('should detect PDF files', () => {
      expect(ParserFactory.detectFileType('test.pdf')).toBe(FileType.PDF);
    });
    
    it('should detect JSON files', () => {
      expect(ParserFactory.detectFileType('test.json')).toBe(FileType.JSON);
    });
    
    it('should return UNKNOWN for unsupported file extensions', () => {
      expect(ParserFactory.detectFileType('test.txt')).toBe(FileType.UNKNOWN);
    });
  });
});
