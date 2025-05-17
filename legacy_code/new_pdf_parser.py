"""
PDF Parser using the new TypeScript PDF Extraction Adapter.

This module provides a Python interface to the TypeScript PDF extraction functionality.
"""

import os
import json
import subprocess
import tempfile
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
from pathlib import Path
import logging

# Set up logging
logger = logging.getLogger(__name__)

class PDFParser:
    """
    Parser for PDF files with structured data (tables) using the TypeScript PDF extraction adapter.
    """
    
    def __init__(self, mapper=None):
        """
        Initialize the PDF parser.
        
        Args:
            mapper: Optional TemplateMapper instance for field mapping (kept for compatibility)
        """
        self.mapper = mapper
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.ts_extractor_path = os.path.join(
            os.path.dirname(self.script_dir),  # parent of legacy_code
            'src',
            'utils',
            'pdfExtractor.js'  # The compiled TypeScript file
        )
        
        # Check if the TypeScript extractor exists
        if not os.path.exists(self.ts_extractor_path):
            raise ImportError(
                f"TypeScript PDF extractor not found at {self.ts_extractor_path}. "
                "Please ensure the TypeScript code is compiled."
            )
    
    def parse_file(self, file_path: str, pages: str = "all") -> Tuple[List[pd.DataFrame], Dict[str, Any]]:
        """
        Parse tables from a PDF file using the TypeScript PDF extractor.
        
        Args:
            file_path: Path to PDF file
            pages: Pages to parse ("all" or comma-separated page numbers)
        
        Returns:
            Tuple of (list of DataFrames, metadata dict)
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found: {file_path}")
        
        results = {
            "file_name": os.path.basename(file_path),
            "tables_found": 0,
            "pages_processed": 0,
            "extraction_method": None,
            "extraction_score": 0,
            "processing_issues": []
        }
        
        try:
            # Read the PDF file
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()
            
            # Create temp file for JSON output
            with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as temp_output:
                output_path = temp_output.name
            
            # Prepare command
            cmd = ["node", self.ts_extractor_path, "--input", file_path, "--output", output_path]
            logger.debug(f"Running command: {' '.join(cmd)}")
            
            # Run the TypeScript extractor
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            stdout, stderr = process.communicate()
            
            # Log any console output from JavaScript
            if stdout:
                logger.debug(f"JS stdout: {stdout}")
            if stderr:
                logger.error(f"JS stderr: {stderr}")
            
            # Check return code
            if process.returncode != 0:
                error_msg = stderr or 'Unknown error in TypeScript extractor'
                results['processing_issues'].append(f"PDF extraction failed: {error_msg}")
                return [], results
            
            # Read and parse the JSON output
            with open(output_path) as f:
                extractor_result = json.load(f)
            
            # Update results with metadata
            results.update({
                'tables_found': len(extractor_result.get('tables', [])),
                'pages_processed': extractor_result.get('metadata', {}).get('pageCount', 0),
                'extraction_method': extractor_result.get('metadata', {}).get('extractionMode', 'unknown'),
                'extraction_score': extractor_result.get('metadata', {}).get('confidence', 0)
            })
            
            # Convert tables to DataFrames
            tables = []
            for table in extractor_result.get('tables', []):
                try:
                    df = pd.DataFrame(table)
                    if self.mapper:
                        df, _ = self.mapper.process_dataframe(df)
                    tables.append(df)
                except Exception as e:
                    error_msg = f"Error processing table: {str(e)}"
                    results['processing_issues'].append(error_msg)
                    logger.error(error_msg)
            
            return tables, results
            
        except Exception as e:
            error_msg = f"Error in PDF extraction: {str(e)}"
            results['processing_issues'].append(error_msg)
            logger.error(error_msg, exc_info=True)
            return [], results
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """
        Get basic information about a PDF file.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Dict with file information
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found: {file_path}")
        
        file_size = os.path.getsize(file_path)
        file_info = {
            "file_name": os.path.basename(file_path),
            "file_path": file_path,
            "file_type": "pdf",
            "file_size": file_size,
            "file_size_mb": round(file_size / (1024 * 1024), 2)
        }
        
        try:
            # Call the TypeScript extractor to get page count and table info
            extractor_result = self._call_typescript_extractor(file_path)
            
            if extractor_result.get('success', False):
                metadata = extractor_result.get('metadata', {})
                file_info.update({
                    'page_count': metadata.get('pageCount', 0),
                    'has_tables': len(extractor_result.get('tables', [])) > 0,
                    'table_count': len(extractor_result.get('tables', [])),
                    'extraction_method': metadata.get('extractionMode', 'unknown')
                })
                
                # Add a sample of the first table if available
                if extractor_result.get('tables'):
                    try:
                        sample = json.dumps(extractor_result['tables'][0][:3], indent=2)
                        file_info['table_sample'] = sample
                    except:
                        pass
            
            return file_info
            
        except Exception as e:
            file_info['extraction_error'] = str(e)
            return file_info

    def _call_typescript_extractor(self, file_path: str) -> Dict[str, Any]:
        """
        Call the TypeScript PDF extractor and return the results.
        
        Args:
            file_path: Path to the PDF file to extract tables from
            
        Returns:
            Dictionary containing the extraction results
        """
        try:
            # Create a temporary file for the output
            with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as temp_file:
                temp_path = temp_file.name
            
            # Prepare command
            cmd = ["node", self.ts_extractor_path, "--input", file_path, "--output", temp_path]
            logger.debug(f"Running command: {' '.join(cmd)}")
            
            # Run the TypeScript extractor
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            stdout, stderr = process.communicate()
            
            # Log any console output from JavaScript
            if stdout:
                logger.debug(f"JS stdout: {stdout}")
            if stderr:
                logger.error(f"JS stderr: {stderr}")
            
            # Check return code
            if process.returncode != 0:
                error_msg = stderr or 'Unknown error in TypeScript extractor'
                return {'success': False, 'error': error_msg}
            
            # Read the results from the temporary file
            with open(temp_path, 'r') as f:
                result = json.load(f)
            
            return result
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
        finally:
            # Clean up the temporary file
            try:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            except:
                pass
