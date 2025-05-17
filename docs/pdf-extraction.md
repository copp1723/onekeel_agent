# PDF Extraction Adapter

A TypeScript adapter for extracting tables from PDF files, designed to replace the legacy camelot implementation. This adapter uses `pdf-parse` for PDF text extraction and implements custom table detection and parsing logic.

## Features

- Supports both lattice (bordered tables) and stream (whitespace-separated) extraction modes
- Automatic mode that selects the best extraction method
- Configurable confidence thresholds and processing options
- Handles multi-page PDFs and complex table structures
- Comprehensive error handling and validation
- TypeScript support with type definitions

## Installation

```bash
npm install pdf-parse
```

## Usage

### Basic Usage

```typescript
import { 
  extractTablesFromPDFFile, 
  PDFExtractionMode 
} from './utils/pdfExtractor';

// Extract tables from a PDF file
const result = await extractTablesFromPDFFile('path/to/your/file.pdf', {
  mode: PDFExtractionMode.AUTO, // Try both lattice and stream, pick best result
  trim: true,                   // Trim whitespace from cell values
  minConfidence: 0.7,           // Minimum confidence score (0-1)
  includePageNumbers: true     // Include page numbers in the output
});

if (result.success) {
  console.log(`Extracted ${result.tables.length} tables`);
  console.log('First table:', result.tables[0]);
} else {
  console.error('Extraction failed:', result.error);
}
```

### Extracting from a Buffer

```typescript
import { extractTablesFromPDF } from './utils/pdfExtractor';
import fs from 'fs';

const pdfBuffer = await fs.promises.readFile('path/to/your/file.pdf');
const result = await extractTablesFromPDF(pdfBuffer, {
  mode: PDFExtractionMode.LATTICE
});
```

## API Reference

### `extractTablesFromPDF(pdfBuffer: Buffer, options?: PDFExtractionOptions): Promise<PDFExtractionResult>`

Extract tables from a PDF buffer.

**Parameters:**
- `pdfBuffer`: Buffer containing the PDF data
- `options`: Optional extraction options (see below)

### `extractTablesFromPDFFile(filePath: string, options?: PDFExtractionOptions): Promise<PDFExtractionResult>`

Extract tables from a PDF file.

**Parameters:**
- `filePath`: Path to the PDF file
- `options`: Optional extraction options (see below)

### `PDFExtractionOptions`

```typescript
interface PDFExtractionOptions {
  /** Extraction mode to use */
  mode?: PDFExtractionMode;
  /** Page numbers to extract (1-based, default: all pages) */
  pages?: number[];
  /** Whether to trim whitespace from cell values */
  trim?: boolean;
  /** Minimum confidence score to accept extraction results (0-1) */
  minConfidence?: number;
  /** Custom column headers to use instead of detected ones */
  headers?: string[];
  /** Whether to include page numbers in the output */
  includePageNumbers?: boolean;
}
```

### `PDFExtractionResult`

```typescript
interface PDFExtractionResult {
  /** Extracted tables as array of records */
  tables: Record<string, any>[][];
  /** Metadata about the extraction */
  metadata: {
    /** Number of pages in the PDF */
    pageCount: number;
    /** Number of tables extracted */
    tableCount: number;
    /** Extraction mode used */
    extractionMode: PDFExtractionMode;
    /** Confidence score of the extraction (0-1) */
    confidence: number;
    /** Any processing issues encountered */
    processingIssues?: string[];
  };
  /** Raw text content of the PDF */
  text?: string;
  /** Whether the extraction was successful */
  success: boolean;
  /** Error message if extraction failed */
  error?: string;
}
```

### `PDFExtractionMode`

```typescript
enum PDFExtractionMode {
  /** For PDFs with bordered tables (grid lines) */
  LATTICE = 'lattice',
  /** For PDFs with tables separated by whitespace */
  STREAM = 'stream',
  /** Try both methods and select the best result */
  AUTO = 'auto'
}
```

## Error Handling

The extractor returns a `PDFExtractionResult` object with a `success` flag. If `success` is `false`, the `error` property will contain details about what went wrong.

## Testing

Run unit tests:

```bash
npm test
```

Run integration tests (requires test PDF files in `test-data/pdfs/`):

```bash
npm run test:integration
```

## Best Practices

1. **Choose the right extraction mode**:
   - Use `LATTICE` for PDFs with clear grid lines
   - Use `STREAM` for PDFs with space-separated data
   - Use `AUTO` (default) to let the adapter decide

2. **Handle errors gracefully**:
   ```typescript
   const result = await extractTablesFromPDFFile('file.pdf');
   if (!result.success) {
     // Handle error
     console.error('Extraction failed:', result.error);
     return;
   }
   // Process extracted tables
   ```

3. **Adjust confidence threshold** based on your requirements:
   ```typescript
   // Lower threshold for more lenient extraction
   const result = await extractTablesFromPDFFile('file.pdf', {
     minConfidence: 0.5
   });
   ```

4. **Pre-process PDFs** if possible to improve extraction quality:
   - Ensure text is selectable (not scanned images)
   - Use standard fonts
   - Avoid complex layouts and merged cells

## Limitations

- Works best with machine-readable PDFs (text-based, not scanned)
- Complex table structures may require custom parsing logic
- Performance may vary with large PDFs

## License

MIT
