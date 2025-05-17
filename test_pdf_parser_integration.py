"""
Integration test suite for legacy_code/new_pdf_parser.py

This script tests the PDF parser with a variety of PDF files, including:
- Simple and complex tables
- Real-world PDFs
- Edge cases (no tables, corrupted/invalid files)

It logs extraction results, errors, and performance metrics for each file.
"""

import os
import sys
import time
import logging
from pathlib import Path
from typing import List, Dict

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

from legacy_code.new_pdf_parser import PDFParser

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("pdf_parser_integration")

# List of test PDF files (add more as needed)
PDF_TEST_FILES = [
    "test-data/pdfs/sample.pdf",
    "test-data/pdfs/simple_table.pdf",
    "test-data/pdfs/table_sample.pdf",
    "real data files/Vinconnect APPT PERFORMANCE.pdf",
    "test-data/pdfs/does_not_exist.pdf",  # Simulate missing file
    "test-data/pdfs/invalid.pdf"           # Simulate corrupted/invalid file (to be created if missing)
]

def ensure_invalid_pdf(path: str):
    """Create a dummy invalid PDF file if it does not exist."""
    if not os.path.exists(path):
        with open(path, 'w') as f:
            f.write("This is not a valid PDF file.")

def run_integration_tests(pdf_files: List[str]):
    parser = PDFParser()
    summary = []
    for pdf_path in pdf_files:
        logger.info(f"\n=== Testing file: {pdf_path} ===")
        result = {
            'file': pdf_path,
            'success': False,
            'error': None,
            'tables_found': 0,
            'time_sec': None,
            'processing_issues': []
        }
        start_time = time.time()
        try:
            file_info = parser.get_file_info(pdf_path)
            logger.info(f"File info: {file_info}")
            tables, extraction_results = parser.parse_file(pdf_path)
            elapsed = time.time() - start_time
            result['time_sec'] = round(elapsed, 2)
            result['tables_found'] = len(tables)
            result['processing_issues'] = extraction_results.get('processing_issues', [])
            if tables:
                logger.info(f"Extracted {len(tables)} tables.")
                for i, table in enumerate(tables, 1):
                    logger.info(f"Table {i}: {len(table)} rows, {len(table.columns)} columns. Columns: {list(table.columns)}")
                    logger.info(f"First 2 rows:\n{table.head(2).to_string()}")
                result['success'] = True
            else:
                logger.warning("No tables found in the PDF.")
        except Exception as e:
            elapsed = time.time() - start_time
            result['time_sec'] = round(elapsed, 2)
            logger.error(f"Error processing {pdf_path}: {str(e)}", exc_info=True)
            result['error'] = str(e)
        summary.append(result)
    logger.info("\n=== Integration Test Summary ===")
    for res in summary:
        logger.info(f"File: {res['file']} | Success: {res['success']} | Tables: {res['tables_found']} | Time: {res['time_sec']}s | Error: {res['error']} | Issues: {res['processing_issues']}")
    # Fail if any required file fails (except the intentionally invalid/missing ones)
    failures = [r for r in summary if not r['success'] and 'invalid.pdf' not in r['file'] and 'does_not_exist' not in r['file']]
    if failures:
        logger.error(f"Integration test failures: {failures}")
        sys.exit(1)
    logger.info("All integration tests passed.")
    sys.exit(0)

if __name__ == "__main__":
    # Ensure the invalid/corrupted PDF file exists
    ensure_invalid_pdf("test-data/pdfs/invalid.pdf")
    run_integration_tests(PDF_TEST_FILES)
