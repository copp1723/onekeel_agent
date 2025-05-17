import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractTablesFromPDF,
  extractTablesFromPDFFile,
  PDFExtractionMode,
  PDFExtractionError
} from '../../../src/utils/pdfExtractor.js';
import pdfParse from 'pdf-parse';

// Mock fs and pdf-parse
vi.mock('fs', async () => {
  return {
    promises: {
      readFile: vi.fn()
    },
    readFileSync: vi.fn(),
    default: {
      promises: {
        readFile: vi.fn()
      },
      readFileSync: vi.fn()
    }
  };
});

vi.mock('pdf-parse', async () => {
  return {
    default: vi.fn()
  };
});

// Define the extraction result type for testing
interface TestExtractionResult {
  tables: any[];
  metadata: {
    pageCount: number;
    tableCount: number;
    extractionMode: PDFExtractionMode;
    actualExtractionMode: PDFExtractionMode;
    confidence: number;
    processingIssues?: string[];
  };
  success: boolean;
  error?: string;
}

describe('PDF Extractor', () => {
  const mockPdfBuffer = Buffer.from('test pdf content');
  const mockPdfText = `
    Header1    Header2    Header3
    -------    -------    -------
    Value1     Value2     Value3
    Value4     Value5     Value6
  `;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(pdfParse).mockResolvedValue({
      text: mockPdfText,
      numpages: 1,
      numrender: 1,
      info: null,
      metadata: null,
      version: null
    });
  });

  describe('extractTablesFromPDF', () => {
    it('should extract tables in LATTICE mode', async () => {
      const result: TestExtractionResult = await extractTablesFromPDF(mockPdfBuffer, {
        mode: PDFExtractionMode.LATTICE
      });

      expect(result.metadata.extractionMode).toBe(PDFExtractionMode.LATTICE);
      expect(result.metadata.actualExtractionMode).toBe(PDFExtractionMode.LATTICE);
      expect(result.success).toBe(true);
    });

    it('should extract tables in STREAM mode', async () => {
      const result: TestExtractionResult = await extractTablesFromPDF(mockPdfBuffer, {
        mode: PDFExtractionMode.STREAM
      });

      expect(result.metadata.extractionMode).toBe(PDFExtractionMode.STREAM);
      expect(result.metadata.actualExtractionMode).toBe(PDFExtractionMode.STREAM);
      expect(result.success).toBe(true);
    });

    it('should try both modes in AUTO mode and select the best result', async () => {
      const result: TestExtractionResult = await extractTablesFromPDF(mockPdfBuffer, {
        mode: PDFExtractionMode.AUTO
      });

      expect(result.tables).toHaveLength(1);
      // The requested mode should still be AUTO
      expect(result.metadata.extractionMode).toBe(PDFExtractionMode.AUTO);
      // The actual mode used should be either LATTICE or STREAM
      expect([PDFExtractionMode.LATTICE, PDFExtractionMode.STREAM]).toContain(result.metadata.actualExtractionMode);
      expect(result.metadata.tableCount).toBeGreaterThan(0);
    });

    it('should handle PDF parse errors', async () => {
      const error = new Error('PDF parse error');
      vi.mocked(pdfParse).mockRejectedValueOnce(error);

      const result: TestExtractionResult = await extractTablesFromPDF(mockPdfBuffer, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('PDF parse error');
    });
  });

  describe('extractTablesFromPDFFile', () => {
    const mockFilePath = '/path/to/test.pdf';

    beforeEach(async () => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(mockPdfBuffer);
    });

    it('should read file and extract tables', async () => {
      const result: TestExtractionResult = await extractTablesFromPDFFile(mockFilePath, {
        mode: PDFExtractionMode.LATTICE
      });

      expect(fs.promises.readFile).toHaveBeenCalledWith(mockFilePath);
      expect(result.success).toBe(true);
      expect(result.tables).toHaveLength(1);
    });

    it('should handle file read errors', async () => {
      vi.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('File not found'));

      const result: TestExtractionResult = await extractTablesFromPDFFile('/nonexistent.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });
});
