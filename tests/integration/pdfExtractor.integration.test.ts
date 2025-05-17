import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractTablesFromPDFFile,
  PDFExtractionMode,
  PDFExtractionOptions
} from '../../../src/utils/pdfExtractor';

describe('PDF Extractor Integration Tests', () => {
  // Directory containing test PDF files
  const testFilesDir = path.join(process.cwd(), 'test-data', 'pdfs');
  
  // Check if test files directory exists
  beforeAll(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  // Helper function to test a PDF file
  async function testPdfExtraction(
    fileName: string,
    options: PDFExtractionOptions = {}
  ) {
    const filePath = path.join(testFilesDir, fileName);
    
    // Skip if test file doesn't exist
    if (!fs.existsSync(filePath)) {
      console.warn(`Test file not found: ${filePath}`);
      return null;
    }

    const result = await extractTablesFromPDFFile(filePath, {
      mode: PDFExtractionMode.AUTO,
      trim: true,
      minConfidence: 0.5,
      ...options
    });

    return result;
  }

  it('should extract tables from a PDF with bordered tables (lattice mode)', async () => {
    const result = await testPdfExtraction('bordered-table.pdf', {
      mode: PDFExtractionMode.LATTICE
    });
    
    if (!result) return; // Skip if file not found
    
    expect(result.success).toBe(true);
    expect(result.tables.length).toBeGreaterThan(0);
    expect(result.metadata.tableCount).toBeGreaterThan(0);
    expect(result.metadata.confidence).toBeGreaterThan(0.7);
  });

  it('should extract tables from a PDF with space-separated tables (stream mode)', async () => {
    const result = await testPdfExtraction('spaced-table.pdf', {
      mode: PDFExtractionMode.STREAM
    });
    
    if (!result) return; // Skip if file not found
    
    expect(result.success).toBe(true);
    expect(result.tables.length).toBeGreaterThan(0);
    expect(result.metadata.tableCount).toBeGreaterThan(0);
  });

  it('should handle PDFs with multiple pages', async () => {
    const result = await testPdfExtraction('multi-page.pdf');
    
    if (!result) return; // Skip if file not found
    
    expect(result.success).toBe(true);
    expect(result.metadata.pageCount).toBeGreaterThan(1);
    expect(result.tables.length).toBeGreaterThan(0);
  });

  it('should handle PDFs with no tables', async () => {
    const result = await testPdfExtraction('no-tables.pdf');
    
    if (!result) return; // Skip if file not found
    
    // Should still be successful but with no tables
    expect(result.success).toBe(true);
    expect(result.tables.length).toBe(0);
  });

  it('should handle malformed PDFs gracefully', async () => {
    const result = await testPdfExtraction('malformed.pdf');
    
    if (!result) return; // Skip if file not found
    
    // Should not throw, but may not be successful
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
