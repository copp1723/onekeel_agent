# PDF Parser Migration Guide

This guide provides instructions for migrating from the legacy camelot-based PDF parser to the new TypeScript-based PDF extraction solution.

## Overview of Changes

### What's Changed

1. **Dependencies**
   - Removed: `camelot`
   - Added: `pdf-parse` (handled by TypeScript)

2. **New Files**
   - `src/utils/pdfExtractor.ts`: Core TypeScript implementation
   - `legacy_code/new_pdf_parser.py`: Python wrapper for the TypeScript extractor
   - Test files and documentation

3. **Removed Files**
   - `legacy_code/pdf_parser.py` (old camelot implementation)

## Migration Steps

### 1. Update Dependencies

Remove the camelot dependency from your Python environment:

```bash
pip uninstall camelot
```

Ensure Node.js and npm are installed for the TypeScript code:

```bash
node --version  # Should be v14 or later
npm --version   # Should be 6.x or later
```

### 2. Build the TypeScript Code

```bash
# Install Node.js dependencies
npm install

# Build the TypeScript code
npm run build:ts
```

### 3. Update Imports

Change any imports from the old PDF parser to the new one:

```python
# Old
from legacy_code.pdf_parser import PDFParser

# New
from legacy_code.new_pdf_parser import PDFParser
```

### 4. Update Code

The API is mostly compatible, but there are some differences to be aware of:

#### Before (Old camelot-based parser):

```python
parser = PDFParser()
tables, results = parser.parse_file("file.pdf")
```

#### After (New TypeScript-based parser):

```python
parser = PDFParser()
tables, results = parser.parse_file("file.pdf")

# The results dictionary has a slightly different structure
# Check the documentation for details
```

### 5. Test Thoroughly

Test your application with various PDF files to ensure the new parser works as expected. Pay attention to:

- Table extraction accuracy
- Performance with different file sizes
- Error handling and edge cases

## Backward Compatibility

The new implementation maintains backward compatibility with the existing API, but there are some differences in the internal structure of the results. Update any code that depends on the exact structure of the results dictionary.

## Performance Considerations

The new implementation may have different performance characteristics:

- The first run may be slower due to Node.js startup time
- Memory usage may be different (typically lower)
- Large PDFs may process faster or slower depending on their structure

## Troubleshooting

### Common Issues

1. **Module not found**
   - Ensure the TypeScript code is built (`npm run build:ts`)
   - Check that Node.js is installed and in your PATH

2. **PDF parsing errors**
   - Verify the PDF is not corrupted
   - Check that the PDF contains actual text (not just images)
   - Try different extraction modes ('lattice' or 'stream')

3. **Performance problems**
   - For large PDFs, consider increasing the Node.js heap size
   - Process PDFs in smaller chunks if possible

## Getting Help

If you encounter issues during migration:

1. Check the logs for detailed error messages
2. Review the documentation in `PDF_EXTRACTION_README.md`
3. Consult the test cases for examples of correct usage
4. Open an issue in the project's issue tracker if you need further assistance

## Rollback Plan

If you need to revert to the old implementation:

1. Reinstall the camelot dependency:
   ```bash
   pip install camelot
   ```

2. Restore the old `pdf_parser.py` file

3. Update any imports back to the old version

However, we recommend working through any issues with the new implementation as it provides better long-term maintainability.
