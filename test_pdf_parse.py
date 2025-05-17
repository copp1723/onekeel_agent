#!/usr/bin/env python3
import sys
from pathlib import Path
from legacy_code.new_pdf_parser import PDFParser
import subprocess

# Use the sample PDF we found earlier
test_pdf = Path('test-data/pdfs/table_sample.pdf')

if not test_pdf.exists():
    print(f"Test PDF not found at {test_pdf}")
    sys.exit(1)

print(f"Testing PDF parser with file: {test_pdf}")
print(f"File size: {test_pdf.stat().st_size} bytes")

# First extract text to verify contents
try:
    print("\nPDF text content (first 20 lines):")
    text = subprocess.check_output(["pdftotext", str(test_pdf), "-"], stderr=subprocess.PIPE, text=True)
    print(text.split('\n')[:20])
except Exception as e:
    print(f"Could not extract text: {str(e)}")

# Then test the parser
parser = PDFParser()
try:
    tables, results = parser.parse_file(str(test_pdf))
    print("\nResults:")
    print(f"Success: {results.get('success', False)}")
    print(f"Tables found: {len(tables)}")
    print(f"Metadata: {results.get('metadata', {})}")
    print(f"Error: {results.get('error', 'None')}")
    
    if 'metadata' in results and 'processingIssues' in results['metadata']:
        print("\nProcessing Issues:")
        for issue in results['metadata']['processingIssues']:
            print(f"- {issue}")
    
    if tables:
        print("\nFirst table sample:")
        print(tables[0].head())
except Exception as e:
    print(f"\nError during parsing: {str(e)}", file=sys.stderr)
    raise
