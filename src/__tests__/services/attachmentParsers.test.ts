/**
 * Tests for Attachment Parser Service
 */
import fs from 'fs';
import path from 'path';
import {
  parseCSV,
  parseXLSX,
  parsePDF,
  parseByExtension,
  detectFileType,
  FileType,
} from '../../services/attachmentParsers.js';
// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));
// Mock csv-parse/sync
jest.mock('csv-parse/sync', () => ({
  parse: jest.fn().mockReturnValue([
    { name: 'John', age: '30' },
    { name: 'Jane', age: '25' },
  ]),
}));
// Mock exceljs
jest.mock('exceljs', () => {
  const mockWorksheet = {
    eachRow: jest.fn((callback) => {
      // Mock header row
      callback(
        {
          eachCell: (cb) => {
            cb({ value: 'name' }, 1);
            cb({ value: 'age' }, 2);
          },
        },
        1
      );
      // Mock data rows
      callback(
        {
          eachCell: (cb) => {
            cb({ value: 'John', type: 0 }, 1);
            cb({ value: 30, type: 0 }, 2);
          },
        },
        2
      );
      callback(
        {
          eachCell: (cb) => {
            cb({ value: 'Jane', type: 0 }, 1);
            cb({ value: 25, type: 0 }, 2);
          },
        },
        3
      );
    }),
    getRow: jest.fn().mockReturnValue({
      eachCell: jest.fn((callback) => {
        callback({ value: 'name' }, 1);
        callback({ value: 'age' }, 2);
      }),
    }),
  };
  return {
    Workbook: jest.fn().mockImplementation(() => ({
      xlsx: {
        readFile: jest.fn().mockResolvedValue(undefined),
      },
      getWorksheet: jest.fn().mockReturnValue(mockWorksheet),
      eachSheet: jest.fn((callback) => {
        callback({ name: 'Sheet1' });
      }),
      worksheets: [{ name: 'Sheet1' }],
    })),
    ValueType: {
      Date: 3,
    },
  };
});
// Mock pdf-parse
jest.mock('pdf-parse', () =>
  jest.fn().mockResolvedValue({
    text: 'Header1 Header2 Header3\nJohn 30 Male\nJane 25 Female',
    numpages: 1,
  })
);
describe('Attachment Parser Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('parseCSV', () => {
    it('should parse CSV files correctly', async () => {
      // Arrange
      const filePath = 'test.csv';
      const csvContent = 'name,age\nJohn,30\nJane,25';
      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      // Act
      const result = await parseCSV(filePath);
      // Assert
      expect(result.records).toHaveLength(2);
      expect(result.recordCount).toBe(2);
      expect(result.metadata.fileType).toBe(FileType.CSV);
      expect(result.metadata.fileName).toBe('test.csv');
    });
  });
  describe('parseXLSX', () => {
    it('should parse Excel files correctly', async () => {
      // Arrange
      const filePath = 'test.xlsx';
      // Act
      const result = await parseXLSX(filePath);
      // Assert
      expect(result.records).toHaveLength(2);
      expect(result.recordCount).toBe(2);
      expect(result.metadata.fileType).toBe(FileType.XLSX);
      expect(result.metadata.fileName).toBe('test.xlsx');
      expect(result.metadata.sheets).toEqual(['Sheet1']);
    });
  });
  describe('parsePDF', () => {
    it('should parse PDF files correctly', async () => {
      // Arrange
      const filePath = 'test.pdf';
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test'));
      // Act
      const result = await parsePDF(filePath);
      // Assert
      expect(result.records).toHaveLength(2);
      expect(result.metadata.fileType).toBe(FileType.PDF);
      expect(result.metadata.fileName).toBe('test.pdf');
      expect(result.metadata.pageCount).toBe(1);
    });
  });
  describe('detectFileType', () => {
    it('should detect CSV files', () => {
      expect(detectFileType('test.csv')).toBe(FileType.CSV);
    });
    it('should detect XLSX files', () => {
      expect(detectFileType('test.xlsx')).toBe(FileType.XLSX);
    });
    it('should detect XLS files', () => {
      expect(detectFileType('test.xls')).toBe(FileType.XLS);
    });
    it('should detect PDF files', () => {
      expect(detectFileType('test.pdf')).toBe(FileType.PDF);
    });
    it('should return UNKNOWN for unsupported file types', () => {
      expect(detectFileType('test.txt')).toBe(FileType.UNKNOWN);
    });
  });
  describe('parseByExtension', () => {
    it('should call parseCSV for CSV files', async () => {
      // Arrange
      const filePath = 'test.csv';
      const csvContent = 'name,age\nJohn,30\nJane,25';
      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      // Act
      const result = await parseByExtension(filePath);
      // Assert
      expect(result.metadata.fileType).toBe(FileType.CSV);
    });
    it('should call parseXLSX for XLSX files', async () => {
      // Arrange
      const filePath = 'test.xlsx';
      // Act
      const result = await parseByExtension(filePath);
      // Assert
      expect(result.metadata.fileType).toBe(FileType.XLSX);
    });
    it('should call parsePDF for PDF files', async () => {
      // Arrange
      const filePath = 'test.pdf';
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test'));
      // Act
      const result = await parseByExtension(filePath);
      // Assert
      expect(result.metadata.fileType).toBe(FileType.PDF);
    });
    it('should throw an error for unsupported file types', async () => {
      // Arrange
      const filePath = 'test.txt';
      // Act & Assert
      await expect(parseByExtension(filePath)).rejects.toThrow('Unsupported file type');
    });
  });
});
