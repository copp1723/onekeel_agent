/**
 * Tests for PDF Extraction Adapter
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractTablesFromPDF,
  extractTablesFromPDFFile,
  PDFExtractionMode
} from '../../utils/pdfExtractor.js';

// Mock pdf-parse
const mockPdfParseResult = {
  numpages: 1,
  numrender: 1,
  info: {},
  metadata: {},
  text: `
    SALES REPORT

    Date: 2023-01-01

    Customer Name    Vehicle    Price    Date Sold
    ---------------  ---------  -------  ---------
    John Smith       Ford F150  $45,000  2023-01-01
    Jane Doe         Honda CRV  $32,000  2023-01-02
    Bob Johnson      Toyota     $28,500  2023-01-03
    ---------------  ---------  -------  ---------

    Total Sales: $105,500
  `,
  version: '1.0'
};

const mockPdfParse = vi.fn().mockResolvedValue(mockPdfParseResult);

vi.mock('pdf-parse', () => {
  return { default: mockPdfParse };
});

// Mock fs
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFileSync: vi.fn().mockImplementation(() => Buffer.from('mock pdf content')),
    existsSync: vi.fn().mockReturnValue(true),
  };
});

describe('PDF Extraction Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractTablesFromPDF', () => {
    it('should extract tables from PDF buffer using AUTO mode', async () => {
      // Arrange
      const pdfBuffer = Buffer.from('mock pdf content');

      // Act
      const result = await extractTablesFromPDF(pdfBuffer, { minConfidence: 0.5 });

      // Debug
      console.log('AUTO mode result:', JSON.stringify(result, null, 2));

      // Assert
      expect(result.success).toBe(true);
      expect(result.tables.length).toBeGreaterThan(0);
      expect(result.metadata.tableCount).toBeGreaterThan(0);
      expect(result.metadata.pageCount).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should extract tables from PDF buffer using LATTICE mode', async () => {
      // Arrange
      const pdfBuffer = Buffer.from('mock pdf content');

      // Act
      const result = await extractTablesFromPDF(pdfBuffer, {
        mode: PDFExtractionMode.LATTICE,
        minConfidence: 0.5
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.tables.length).toBeGreaterThan(0);
      expect(result.metadata.extractionMode).toBe(PDFExtractionMode.LATTICE);
    });

    it('should extract tables from PDF buffer using STREAM mode', async () => {
      // Arrange
      const pdfBuffer = Buffer.from('mock pdf content');

      // Act
      const result = await extractTablesFromPDF(pdfBuffer, {
        mode: PDFExtractionMode.STREAM,
        minConfidence: 0.5
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.tables.length).toBeGreaterThan(0);
      expect(result.metadata.extractionMode).toBe(PDFExtractionMode.STREAM);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const pdfBuffer = Buffer.from('mock pdf content');

      // Mock pdf-parse to throw an error
      mockPdfParse.mockImplementationOnce(() => {
        throw new Error('Mock PDF parsing error');
      });

      // Act
      const result = await extractTablesFromPDF(pdfBuffer);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Mock PDF parsing error');
      expect(result.tables).toHaveLength(0);
    });

    it('should return low confidence when no tables are found', async () => {
      // Arrange
      const pdfBuffer = Buffer.from('mock pdf content');

      // Mock pdf-parse to return text without tables
      mockPdfParse.mockImplementationOnce(() => {
        return Promise.resolve({
          numpages: 1,
          numrender: 1,
          info: {},
          metadata: {},
          text: 'This is a PDF without any tables.',
          version: '1.0'
        });
      });

      // Act
      const result = await extractTablesFromPDF(pdfBuffer);

      // Assert
      expect(result.success).toBe(false);
      expect(result.metadata.confidence).toBeLessThan(0.7);
      expect(result.tables).toHaveLength(0);
    });
  });

  describe('extractTablesFromPDFFile', () => {
    it('should extract tables from PDF file', async () => {
      // Arrange
      const filePath = 'test.pdf';

      // Act
      const result = await extractTablesFromPDFFile(filePath, { minConfidence: 0.5 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.tables.length).toBeGreaterThan(0);
      expect(fs.readFileSync).toHaveBeenCalledWith(filePath);
    });

    it('should handle file read errors', async () => {
      // Arrange
      const filePath = 'nonexistent.pdf';

      // Create a spy on fs.readFileSync that throws an error
      const readFileSpy = vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('File not found');
      });

      // Act
      const result = await extractTablesFromPDFFile(filePath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
      expect(result.tables).toHaveLength(0);

      // Clean up
      readFileSpy.mockRestore();
    });
  });

  // Integration test with real file
  describe('Integration with real PDF file', () => {
    // Skip this test by default as it requires a real PDF file
    it.skip('should extract tables from a real PDF file', async () => {
      // Arrange
      const realFilePath = path.join(process.cwd(), 'real data files', 'Vinconnect APPT PERFORMANCE.pdf');

      // Unmock fs for this test
      vi.unmock('fs');
      vi.unmock('pdf-parse');

      // Skip if file doesn't exist
      if (!fs.existsSync(realFilePath)) {
        console.warn(`Skipping real file test: ${realFilePath} not found`);
        return;
      }

      // Act
      const result = await extractTablesFromPDFFile(realFilePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.tables.length).toBeGreaterThan(0);
      expect(result.metadata.pageCount).toBeGreaterThan(0);

      // Re-mock for other tests
      vi.mock('fs', async (importOriginal) => {
        const actual = await importOriginal();
        return {
          ...actual,
          readFileSync: vi.fn().mockImplementation(() => Buffer.from('mock pdf content')),
          existsSync: vi.fn().mockReturnValue(true),
        };
      });
      vi.mock('pdf-parse');
    });
  });
});
