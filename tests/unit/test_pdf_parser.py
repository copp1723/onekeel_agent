"""
Unit tests for the PDF parser.

These tests verify the functionality of individual components of the PDF parser.
"""

import unittest
import os
import json
import tempfile
from unittest.mock import patch, MagicMock, mock_open, call
import pandas as pd
import numpy as np

# Import the PDF parser
from legacy_code.new_pdf_parser import PDFParser

class TestPDFParser(unittest.TestCase):
    """Unit tests for the PDF parser."""
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        # Patch os.path.exists to always return True for our test file
        self.patcher_exists = patch('os.path.exists', return_value=True)
        self.mock_exists = self.patcher_exists.start()

        # Patch subprocess.Popen for testing _call_typescript_extractor
        self.popen_patcher = patch('subprocess.Popen')
        self.mock_popen = self.popen_patcher.start()

        # Patch tempfile.NamedTemporaryFile so we can control the temp file path
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.json')
        self.temp_file.close()  # We'll write to it directly
        self.tempfile_patcher = patch('tempfile.NamedTemporaryFile', return_value=self.temp_file)
        self.mock_tempfile = self.tempfile_patcher.start()

        # Mock the Popen instance
        self.mock_process = MagicMock()
        self.mock_popen.return_value = self.mock_process

        # Sample data for testing
        self.sample_pdf_path = "/path/to/test.pdf"
        self.sample_table_data = [
            ["Name", "Age", "City"],
            ["Alice", "30", "New York"],
            ["Bob", "25", "San Francisco"],
            ["Charlie", "35", "Chicago"]
        ]
        self.sample_df = pd.DataFrame(self.sample_table_data[1:], columns=self.sample_table_data[0])

        # Initialize the parser after patching
        self.parser = PDFParser()

        # Mock the TypeScript extractor path
        self.parser.ts_extractor_path = "/path/to/pdfExtractor.js"
    
    def tearDown(self):
        """Clean up after each test method."""
        self.patcher_exists.stop()
        self.popen_patcher.stop()
        self.tempfile_patcher.stop()
        # Remove temp file if it exists
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)
        
    def _setup_mock_process(self, returncode=0, stdout="", stderr=""):
        """Helper to set up the mock process with the given return values."""
        self.mock_process.returncode = returncode
        self.mock_process.communicate.return_value = (stdout, stderr)
    
    def test_initialization(self):
        """Test that the parser initializes correctly."""
        self.assertIsNotNone(self.parser)
        self.assertTrue(hasattr(self.parser, 'parse_file'))
        self.assertTrue(callable(self.parser.parse_file))
        self.assertEqual(self.parser.ts_extractor_path, "/path/to/pdfExtractor.js")
    
    def test_parse_file_success(self):
        """Test successful PDF parsing."""
        # Create a sample result
        result_data = {
            'success': True,
            'tables': [self.sample_table_data],
            'metadata': {
                'pageCount': 1,
                'extractionMode': 'lattice',
                'confidence': 0.95
            }
        }
        with open(self.temp_file.name, 'w') as f:
            json.dump(result_data, f)

        # Setup the mock process
        self._setup_mock_process(returncode=0, stdout="", stderr="")

        # Call the method
        tables, results = self.parser.parse_file(self.sample_pdf_path)

        # Verify the results
        self.assertIsInstance(tables, list)
        self.assertEqual(len(tables), 1)
        self.assertIsInstance(tables[0], pd.DataFrame)
        self.assertEqual(tables[0].iloc[0, 0], "Alice")
        self.assertEqual(tables[0].iloc[1, 0], "Bob")
        self.assertEqual(tables[0].iloc[0, 1], "30")

        # Verify the results metadata
        self.assertEqual(results['tables_found'], 1)
        self.assertEqual(results['pages_processed'], 1)
        self.assertEqual(results['extraction_method'], 'lattice')
        self.assertEqual(results['extraction_score'], 0.95)
        self.assertEqual(results['processing_issues'], [])

        # Verify file existence was checked
            self.mock_exists.assert_called_with(self.sample_pdf_path)
            
        finally:
            # Clean up
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
    
    def test_parse_file_failure(self):
        """Test PDF parsing failure."""
        # Setup mock process with failure
        self._setup_mock_process(returncode=1, stdout="", stderr="Error: Failed to parse PDF")
        
        # Call the method
        tables, results = self.parser.parse_file(self.sample_pdf_path)
        
        # Verify the results
        self.assertEqual(len(tables), 0)
        self.assertIn('PDF extraction failed', results['processing_issues'][0])
        self.assertEqual(results['tables_found'], 0)
        self.assertEqual(results['extraction_method'], None)
        self.assertEqual(results['extraction_score'], 0)

        # Verify file existence was checked
        self.mock_exists.assert_called_with(self.sample_pdf_path)

    def test_parse_file_empty(self):
        """Test parsing a PDF with no tables."""
        # Setup mock process with empty tables
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.json')
        try:
            # Create a sample result with no tables
            result_data = {
                'success': True,
                'tables': [],
                'metadata': {
                    'pageCount': 1,
                    'extractionMode': 'lattice',
                    'confidence': 0.0
                }
            }
            json.dump(result_data, open(temp_file.name, 'w'))
            
            # Setup the mock process
            self._setup_mock_process(returncode=0, stdout="", stderr="")
            
            # Call the method
            tables, results = self.parser.parse_file(self.sample_pdf_path)
            
            # Verify the results
            self.assertIsInstance(tables, list)
            self.assertEqual(len(tables), 0)
            self.assertEqual(results['tables_found'], 0)
            
            # Verify file existence was checked
            self.mock_exists.assert_called_with(self.sample_pdf_path)
            
        finally:
            # Clean up
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
    
    def test_parse_file_nonexistent(self):
        """Test parsing a non-existent file."""
        # Make os.path.exists return False for this test
        self.mock_exists.return_value = False
        
        with self.assertRaises(FileNotFoundError) as context:
            self.parser.parse_file("nonexistent.pdf")
        
        self.assertIn('PDF file not found', str(context.exception))
        self.mock_exists.assert_called_with("nonexistent.pdf")
    
    def test_parse_file_invalid_json(self):
        """Test handling of invalid JSON from the subprocess."""
        # Write invalid JSON to the temp file
        with open(self.temp_file.name, 'w') as f:
            f.write('Invalid JSON')

        # Setup the mock process
        self._setup_mock_process(returncode=0, stdout="", stderr="")

        # Call the method
        with self.assertRaises(json.JSONDecodeError):
            self.parser.parse_file(self.sample_pdf_path)

        # Verify file existence was checked
        self.mock_exists.assert_called_with(self.sample_pdf_path)

    
    @patch('pandas.DataFrame')
    def test_parse_file_pandas_error(self, mock_df):
        """Test handling of pandas DataFrame creation error."""
        # Create a sample result
        result_data = {
            'success': True,
            'tables': [self.sample_table_data],
            'metadata': {
                'pageCount': 1,
                'extractionMode': 'lattice',
                'confidence': 0.95
            }
        }
        with open(self.temp_file.name, 'w') as f:
            json.dump(result_data, f)

        # Setup the mock process
        self._setup_mock_process(returncode=0, stdout="", stderr="")

        # Make pandas.DataFrame raise an exception
        mock_df.side_effect = Exception("Pandas error")

        # Call the method
        tables, results = self.parser.parse_file(self.sample_pdf_path)

        # Verify the results
        self.assertEqual(len(tables), 0)
        self.assertIn('Error processing table', results['processing_issues'][0])
        self.assertEqual(results['tables_found'], 1)
        self.assertEqual(results['pages_processed'], 1)
        self.assertEqual(results['extraction_method'], 'lattice')
        self.assertEqual(results['extraction_score'], 0.95)

        # Verify file existence was checked
        self.mock_exists.assert_called_with(self.sample_pdf_path)


if __name__ == '__main__':
    unittest.main()
