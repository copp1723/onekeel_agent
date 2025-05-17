# PDF Parser Migration Guide

This document outlines the changes made to migrate from the camelot-based PDF parser to the new TypeScript-based PDF extraction adapter.

## Overview

The PDF parsing functionality has been updated to use a new TypeScript-based implementation that provides better reliability and maintainability compared to the previous camelot-based solution. The new implementation uses `pdf-parse` for text extraction and includes custom table detection logic.

## Changes Made

1. **New Files Added**:
   - `legacy_code/new_pdf_parser.py`: New PDF parser implementation using the TypeScript adapter
   - `test_pdf_parser.py`: Test script for verifying the PDF parser

2. **Files Modified**:
   - `legacy_code/upload.py`: Updated to use the new PDF parser

3. **Dependencies**:
   - Removed: `camelot`
   - Added: `pdf-parse` (handled by the TypeScript adapter)

## How to Use the New PDF Parser

### Basic Usage

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

### Getting File Information

```python
# Get information about a PDF file
file_info = parser.get_file_info("path/to/your/file.pdf")
print("File information:")
for key, value in file_info.items():
    print(f"{key}: {value}")
```

### Running Tests

To test the PDF parser with a sample PDF file:

```bash
python test_pdf_parser.py path/to/your/test.pdf
```

## Migration Notes

1. **Backward Compatibility**:
   - The new parser maintains the same interface as the old one, so existing code should work without changes.
   - The `parse_file` method still returns a tuple of `(tables, results)` where `tables` is a list of pandas DataFrames.

2. **Error Handling**:
   - The new parser includes improved error handling and logging.
   - Check the `results` dictionary for any processing issues or warnings.

3. **Performance**:
   - The TypeScript implementation may have different performance characteristics than the camelot-based parser.
   - Large PDF files may take longer to process due to the additional text extraction step.

4. **Dependencies**:
   - Ensure that Node.js is installed on the system where the code will run.
   - The TypeScript code must be compiled before use (run `npm run build` in the project root).

## Troubleshooting

### Common Issues

1. **Module Not Found**
   - Ensure that the TypeScript code is compiled and the JavaScript files are in the correct location.
   - Verify that Node.js is installed and available in the system PATH.

2. **PDF Parsing Errors**
   - Check that the PDF file is not password protected.
   - Verify that the PDF contains selectable text (not scanned images).
   - Try using a different extraction mode (lattice or stream) if the default doesn't work well.

3. **Performance Problems**
   - For large PDFs, consider processing the file in chunks.
   - Check the system resources (CPU and memory) during processing.

## Future Improvements

- Add support for more PDF table formats and layouts
- Improve table detection and extraction accuracy
- Add more detailed logging and debugging information
- Implement caching for frequently accessed PDFs
- Add support for password-protected PDFs

## License

This code is part of the Watchdog AI project and is subject to the project's license terms.
