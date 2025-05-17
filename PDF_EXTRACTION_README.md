# PDF Extraction with TypeScript Adapter

This document provides an overview of the PDF extraction functionality in the project, which has been migrated from a Python-based camelot implementation to a more robust TypeScript-based solution using `pdf-parse`.

## Overview

The PDF extraction functionality allows the application to extract tabular data from PDF files. The new implementation provides several advantages over the previous camelot-based solution:

- Better reliability and accuracy
- More consistent results across different PDF formats
- Improved error handling and logging
- Better integration with the TypeScript/JavaScript ecosystem
- Reduced dependency on system libraries

## Components

1. **TypeScript PDF Extractor** (`src/utils/pdfExtractor.ts`)
   - Core functionality for extracting tables from PDFs
   - Supports both lattice and stream extraction methods
   - Provides a clean, type-safe API

2. **Python Wrapper** (`legacy_code/new_pdf_parser.py`)
   - Provides a Python interface to the TypeScript extractor
   - Maintains backward compatibility with existing code
   - Handles file I/O and error handling

3. **Test Scripts**
   - `test_pdf_parser.py`: Python script to test the PDF parser
   - `test_pdf_extractor.js`: Node.js script to test the TypeScript extractor directly
   - Unit and integration tests in the `tests/` directory

## Installation

1. Ensure you have Node.js (v14 or later) and npm installed
2. Install the project dependencies:
   ```bash
   npm install
   ```
3. Build the TypeScript code:
   ```bash
   npm run build:ts
   ```

## Usage

### From Python

```python
from legacy_code.new_pdf_parser import PDFParser

# Initialize the parser
parser = PDFParser()

# Parse a PDF file
tables, results = parser.parse_file("path/to/your/file.pdf")

# Process the extracted tables
for i, table in enumerate(tables, 1):
    print(f"Table {i}:")
    print(table.head())  # Display first few rows
    print("\n")
```

### From JavaScript/TypeScript

```typescript
import { extractTablesFromPDFFile } from './src/utils/pdfExtractor';

async function extractTables(pdfPath: string) {
  const result = await extractTablesFromPDFFile(pdfPath, {
    mode: 'auto',  // 'lattice', 'stream', or 'auto'
    trim: true,
    minConfidence: 0.5
  });
  
  if (result.success) {
    console.log(`Extracted ${result.tables.length} tables`);
    return result.tables;
  } else {
    console.error('Extraction failed:', result.error);
    return [];
  }
}
```

## Testing

### Run Unit Tests

```bash
npm test
```

### Test the PDF Parser

```bash
# Using the Python test script
python test_pdf_parser.py test-data/pdfs/table_sample.pdf

# Or using npm script
npm run test:pdf-parser

# Test the TypeScript extractor directly
node test_pdf_extractor.js test-data/pdfs/table_sample.pdf
```

## Error Handling

The PDF extraction functions return a result object with the following structure:

```typescript
{
  success: boolean;           // Whether the extraction was successful
  tables: any[][];            // Extracted tables (array of arrays)
  metadata: {
    pageCount: number;        // Number of pages in the PDF
    tableCount: number;       // Number of tables found
    extractionMode: string;   // Method used for extraction
    confidence: number;       // Confidence score (0-1)
    processingIssues?: string[]; // Any issues encountered
  };
  error?: string;             // Error message if extraction failed
}
```

## Performance Considerations

- Large PDFs may take some time to process. Consider processing them in chunks if performance is a concern.
- The 'lattice' method is generally more accurate but slower than 'stream'.
- The 'auto' mode will try both methods and select the best result.

## Troubleshooting

### Common Issues

1. **No tables found**
   - Ensure the PDF contains actual text (not just images)
   - Try adjusting the `minConfidence` parameter
   - Check the processing issues in the results for more details

2. **Extraction errors**
   - Verify that the PDF is not password protected
   - Check that the file is not corrupted
   - Ensure you have sufficient permissions to read the file

3. **Performance problems**
   - For large PDFs, consider increasing the Node.js heap size:
     ```bash
     NODE_OPTIONS="--max-old-space-size=4096" node your-script.js
     ```

## License

This code is part of the Watchdog AI project and is subject to the project's license terms.
