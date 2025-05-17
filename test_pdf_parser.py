"""
Test script for the new PDF parser implementation.

This script tests the PDF parser with a sample PDF file.
"""

import os
import sys
import logging
from pathlib import Path

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_pdf_parser(pdf_path):
    """Test the PDF parser with the given PDF file."""
    from legacy_code.new_pdf_parser import PDFParser
    
    if not os.path.exists(pdf_path):
        logger.error(f"PDF file not found: {pdf_path}")
        return False
    
    try:
        logger.info(f"Testing PDF parser with file: {pdf_path}")
        
        # Get file info
        parser = PDFParser()
        file_info = parser.get_file_info(pdf_path)
        
        logger.info("File information:")
        for key, value in file_info.items():
            if key not in ['text_sample', 'table_sample']:  # Skip large fields in the log
                logger.info(f"  {key}: {value}")
        
        # Extract tables
        logger.info("Extracting tables...")
        tables, results = parser.parse_file(pdf_path)
        
        if not tables:
            logger.warning("No tables found in the PDF")
            return False
        
        logger.info(f"Extracted {len(tables)} tables")
        
        # Print info about each table
        for i, table in enumerate(tables, 1):
            logger.info(f"\nTable {i}:")
            logger.info(f"  Rows: {len(table)}")
            logger.info(f"  Columns: {', '.join(table.columns)}")
            logger.info("  First 3 rows:")
            print(table.head(3).to_string())
        
        return True
        
    except Exception as e:
        logger.error(f"Error testing PDF parser: {str(e)}", exc_info=True)
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Test the PDF parser with a PDF file.')
    parser.add_argument('pdf_file', help='Path to the PDF file to test with')
    args = parser.parse_args()
    
    success = test_pdf_parser(args.pdf_file)
    
    if success:
        logger.info("PDF parser test completed successfully")
        sys.exit(0)
    else:
        logger.error("PDF parser test failed")
        sys.exit(1)
