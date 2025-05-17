#!/usr/bin/env python3
"""
Test script for PDF parser integration with data_parser.py.

This script tests the PDF parsing functionality in data_parser.py.
"""

import os
import sys
import logging
from pathlib import Path
import pandas as pd

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import the data parser
from data_parser import parse_file, get_file_info, detect_file_type, PDF_PARSING_AVAILABLE

def test_pdf_detection():
    """Test PDF file type detection."""
    logger.info("Testing PDF file type detection...")
    
    # Test with a PDF file
    pdf_path = "test-data/pdfs/sample.pdf"
    if os.path.exists(pdf_path):
        file_type = detect_file_type(pdf_path)
        assert file_type == 'pdf', f"Expected 'pdf', got '{file_type}'"
        logger.info("PDF file type detection: PASSED")
    else:
        logger.warning(f"Skipping PDF file type detection test: {pdf_path} not found")

def test_pdf_info():
    """Test getting PDF file information."""
    if not PDF_PARSING_AVAILABLE:
        logger.warning("Skipping PDF info test: PDF parsing is not available")
        return
    
    logger.info("Testing PDF file information retrieval...")
    
    # Test with a PDF file
    pdf_path = "test-data/pdfs/sample.pdf"
    if os.path.exists(pdf_path):
        file_info = get_file_info(pdf_path)
        
        # Check basic info
        assert file_info["file_type"] == 'pdf', "File type should be 'pdf'"
        assert "page_count" in file_info, "PDF info should include page count"
        assert "has_tables" in file_info, "PDF info should include has_tables flag"
        
        logger.info(f"PDF file info: {file_info}")
        logger.info("PDF file information retrieval: PASSED")
    else:
        logger.warning(f"Skipping PDF info test: {pdf_path} not found")

def test_pdf_parsing():
    """Test parsing a PDF file."""
    if not PDF_PARSING_AVAILABLE:
        logger.warning("Skipping PDF parsing test: PDF parsing is not available")
        return
    
    logger.info("Testing PDF file parsing...")
    
    # Test with a PDF file
    pdf_path = "test-data/pdfs/sample.pdf"
    if os.path.exists(pdf_path):
        try:
            df = parse_file(pdf_path)
            
            # Check that we got a DataFrame
            assert isinstance(df, pd.DataFrame), "Result should be a DataFrame"
            
            # Log some info about the DataFrame
            logger.info(f"Parsed PDF into DataFrame with {len(df)} rows and {len(df.columns)} columns")
            if not df.empty:
                logger.info(f"Columns: {', '.join(df.columns)}")
                logger.info(f"First few rows:\n{df.head()}")
            
            logger.info("PDF file parsing: PASSED")
        except Exception as e:
            logger.error(f"Error parsing PDF file: {str(e)}")
            raise
    else:
        logger.warning(f"Skipping PDF parsing test: {pdf_path} not found")

def ensure_test_data():
    """Ensure test data directory exists."""
    test_data_dir = Path("test-data/pdfs")
    test_data_dir.mkdir(parents=True, exist_ok=True)
    
    # Check if we have any PDF files for testing
    pdf_files = list(test_data_dir.glob("*.pdf"))
    if not pdf_files:
        logger.warning(f"No PDF files found in {test_data_dir}. Tests will be skipped.")
        logger.info("Please add PDF files to the test-data/pdfs directory for testing.")
    
    return bool(pdf_files)

def main():
    """Run the tests."""
    logger.info("Starting PDF parser integration tests...")
    
    # Ensure test data is available
    has_test_files = ensure_test_data()
    
    # Run the tests
    test_pdf_detection()
    
    if has_test_files:
        test_pdf_info()
        test_pdf_parsing()
    
    logger.info("PDF parser integration tests completed.")

if __name__ == "__main__":
    main()
