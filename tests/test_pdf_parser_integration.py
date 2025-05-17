"""
Integration tests for the PDF parser.

These tests verify that the PDF parser works correctly with various PDF files.
"""

import os
import unittest
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Tuple

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from legacy_code.new_pdf_parser import PDFParser

class TestPDFParserIntegration(unittest.TestCase):    
    """Integration tests for the PDF parser."""
    
    @classmethod
    def setUpClass(cls):
        """Set up test fixtures before any tests are run."""
        cls.parser = PDFParser()
        cls.test_data_dir = Path(__file__).parent / 'test-data' / 'pdfs'
        
        # Use existing test PDFs
        cls.test_pdfs = {
            'sample': 'sample.pdf',
            'table_sample': 'table_sample.pdf',
            'invalid': 'invalid.pdf'
        }
        
        # Verify at least one test file exists
        if not any((cls.test_data_dir / fname).exists() for fname in cls.test_pdfs.values()):
            pytest.skip("No test PDFs found")
        
        # Create test data directory if it doesn't exist
        cls.test_data_dir.mkdir(parents=True, exist_ok=True)
        
    @classmethod
    def _create_simple_table_pdf(cls, output_path: Path):
        """Create a simple table PDF for testing."""
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        
        doc = SimpleDocTemplate(str(output_path), pagesize=letter)
        elements = []
        
        # Add a title
        styles = getSampleStyleSheet()
        elements.append(Paragraph("Test PDF Document", styles['Title']))
        elements.append(Paragraph("This is a test PDF with a simple table.", styles['Normal']))
        
        # Create a simple table
        data = [
            ['ID', 'Name', 'Value'],
            ['1', 'Test Item 1', '$10.99'],
            ['2', 'Test Item 2', '$20.50'],
            ['3', 'Test Item 3', '$15.75'],
            ['4', 'Test Item 4', '$8.25'],
            ['5', 'Test Item 5', '$12.99']
        ]
        
        # Create the table
        table = Table(data, colWidths=[100, 200, 100])
        
        # Add style to the table
        style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ])
        
        table.setStyle(style)
        elements.append(table)
        
        # Build the PDF
        doc.build(elements)
    
    def test_parse_simple_table(self):
        """Test parsing a simple table PDF."""
        pdf_path = str(self.test_data_dir / self.test_pdfs['table_sample'])
        
        # Parse the PDF
        tables, results = self.parser.parse_file(pdf_path)
        
        # Verify the results
        self.assertIsInstance(tables, list)
        self.assertGreater(len(tables), 0, "No tables were extracted from the PDF")
        
        # Check the first table
        table = tables[0]
        self.assertIsInstance(table, pd.DataFrame)
        
        # Verify the table structure
        self.assertGreaterEqual(len(table.columns), 3, "Table should have at least 3 columns")
        self.assertGreaterEqual(len(table), 5, "Table should have at least 5 rows of data")
        
        # Check some sample data
        self.assertIn("Test Item 1", table.values, "Expected data not found in table")
        self.assertIn("$10.99", table.values, "Expected data not found in table")
        
        # Verify the results dictionary
        self.assertIsInstance(results, dict)
        self.assertIn('success', results)
        self.assertTrue(results['success'], "PDF parsing was not successful")
    
    def test_parse_nonexistent_file(self):
        """Test parsing a non-existent PDF file."""
        with self.assertRaises(FileNotFoundError):
            self.parser.parse_file("nonexistent.pdf")
    
    def test_parse_invalid_file(self):
        """Test parsing an invalid PDF file."""
        # Create a non-PDF file
        invalid_pdf = self.test_data_dir / "invalid.pdf"
        with open(invalid_pdf, 'w') as f:
            f.write("This is not a PDF file")
        
        try:
            with self.assertRaises(Exception):
                self.parser.parse_file(str(invalid_pdf))
        finally:
            # Clean up
            if invalid_pdf.exists():
                invalid_pdf.unlink()

if __name__ == '__main__':
    unittest.main()
