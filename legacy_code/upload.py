"""
Upload page for Watchdog AI.

This page handles file uploads, validation, and processing.
"""

import pandas as pd
import os
import time
import json
import logging
from pathlib import Path
import tempfile
import importlib.util

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import configuration, with fallbacks
try:
    from legacy_code.config import (
        FILE_PROCESSING, DATA_DICTIONARY_PATH, SAMPLE_DATA_DIR, APP_NAME
    )
except (ImportError, AttributeError) as e:
    logger.warning(f"Could not import all config variables: {e}")
    # Define fallbacks
    FILE_PROCESSING = {
        "max_file_size_mb": 50,
        "allowed_extensions": {
            ".csv": "text/csv",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls": "application/vnd.ms-excel",
            ".pdf": "application/pdf",
            ".txt": "text/plain"
        },
        "enable_pdf_processing": True
    }
    DATA_DICTIONARY_PATH = Path(__file__).parent / "data_dictionary.json"
    SAMPLE_DATA_DIR = Path(__file__).parent.parent / "assets" / "sample_data"
    APP_NAME = "Watchdog AI"

# Import data processing components
from legacy_code.csv_parser import CSVParser
from legacy_code.template_mapper import TemplateMapper
# from legacy_code.data_validator import DataValidator  # TODO: Implement or restore DataValidator

# Import services (will implement properly in next step)
# from src.services.storage import upload_to_supabase

def is_valid_file(file):
    """Check if the file is valid for upload."""
    # Check file size
    max_size_bytes = FILE_PROCESSING["max_file_size_mb"] * 1024 * 1024
    if file.size > max_size_bytes:
        return False, f"File is too large. Maximum size is {FILE_PROCESSING['max_file_size_mb']} MB."

    # Check file extension
    file_ext = os.path.splitext(file.name)[1].lower()
    if file_ext not in FILE_PROCESSING["allowed_extensions"]:
        allowed_exts = ", ".join(FILE_PROCESSING["allowed_extensions"].keys())
        return False, f"File type '{file_ext}' is not supported. Supported types: {allowed_exts}"

    return True, ""

def parse_uploaded_file(file, temp_path):
    """
    Parse an uploaded file using the appropriate parser, given a temp file path.
    Returns (DataFrame, processing_results, error_str_or_None)
    """
    file_ext = os.path.splitext(file.name)[1].lower()
    try:
        if file_ext in ['.csv', '.txt', '.xls', '.xlsx']:
            try:
                # Create parser with more robust error handling for data dictionary
                parser = CSVParser()
                df, results = parser.parse_file(temp_path)
                return df, results, None
            except FileNotFoundError as e:
                logger.error(f"Data dictionary not found: {e}")
                # Try to use the data dictionary from legacy_code directory
                try:
                    # Create a TemplateMapper with explicit path to data dictionary
                    from legacy_code.template_mapper import TemplateMapper
                    mapper = TemplateMapper(dictionary_path=str(Path(__file__).parent / "data_dictionary.json"))
                    parser = CSVParser(mapper=mapper)
                    df, results = parser.parse_file(temp_path)
                    return df, results, None
                except Exception as inner_e:
                    logger.error(f"Failed to use fallback data dictionary: {inner_e}")
                    return None, None, f"Data dictionary error: {str(e)}. Fallback also failed: {str(inner_e)}"
            except Exception as e:
                logger.error(f"Error parsing CSV/Excel file: {e}")
                return None, None, f"Error parsing file: {str(e)}"
        elif file_ext == '.pdf':
            if FILE_PROCESSING.get("enable_pdf_processing", False):
                try:
                    from legacy_code.new_pdf_parser import PDFParser
                    
                    logger.info(f"Initializing PDF parser for file: {file.name}")
                    parser = PDFParser()
                    
                    logger.info("Starting PDF table extraction...")
                    tables, results = parser.parse_file(temp_path)
                    
                    if not tables:
                        logger.warning("No tables found in the PDF file")
                        return None, None, "No tables found in the PDF file."
                        
                    logger.info(f"Successfully extracted {len(tables)} tables from PDF")
                    
                    # Use the first table by default
                    df = tables[0]
                    
                    # Log some basic info about the extracted data
                    if not df.empty:
                        logger.info(f"Extracted table with {len(df)} rows and {len(df.columns)} columns")
                        logger.debug(f"Columns: {', '.join(df.columns)}")
                    
                    return df, results, None
                    
                except ImportError as ie:
                    error_msg = f"PDF parser module not found: {str(ie)}"
                    logger.error(error_msg, exc_info=True)
                    return None, None, f"PDF parser module not found. Please install required dependencies. Error: {str(ie)}"
                    
                except Exception as e:
                    error_msg = f"Error parsing PDF file: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    return None, None, f"Error parsing PDF file: {str(e)}"
            else:
                return None, None, "PDF processing is not enabled."
        else:
            return None, None, f"File type '{file_ext}' is not supported."
    except Exception as e:
        logger.error(f"Unexpected error in parse_uploaded_file: {e}")
        return None, None, f"Error parsing file: {str(e)}"

def validate_dataframe(df):
    """
    # TODO: Implement validation logic when DataValidator is available.
    For now, this is a stub that returns a placeholder result.
    """
    return {"validation": "skipped (no DataValidator)"}, None

def process_file(file):
    """
    Orchestrate parsing and validation of an uploaded file.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.name)[1]) as temp_file:
        temp_file.write(file.getbuffer())
        temp_path = temp_file.name
    try:
        df, processing_results, parse_err = parse_uploaded_file(file, temp_path)
        if parse_err:
            return False, None, parse_err
        validation_results, val_err = validate_dataframe(df)
        # Validation is skipped if DataValidator is not present
        combined_results = {
            "processing_results": processing_results,
            "validation_results": validation_results,
            "filename": file.name,
            "rows": len(df),
            "columns": list(df.columns),
            "preview": df.head(5).to_dict(orient="records")
        }
        return True, df, combined_results
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

def render_upload_page():
    import streamlit as st
    """Render the upload page."""
    st.title("Upload Files")
    st.write("Upload your dealership data files for analysis.")

    uploaded_file = st.file_uploader(
        "Choose a file",
        type=["csv", "xlsx", "pdf"],
        help="Upload a CSV, Excel, or PDF file containing your dealership data."
    )

    if uploaded_file is not None:
        with st.spinner("Processing file..."):
            success, df, results = process_file(uploaded_file)
        if success:
            st.success(f"File '{uploaded_file.name}' processed successfully!")
            st.write(f"Number of rows: {results['rows']}")
            st.write(f"Number of columns: {len(results['columns'])}")
            st.subheader("Data Preview")
            st.dataframe(df.head())
            st.subheader("Validation Results")
            st.json(results["validation_results"])
            st.subheader("Processing Results")
            st.json(results["processing_results"])
        else:
            st.error(f"Error: {results}")

if __name__ == "__main__":
    # This allows running just this page for development
    render_upload_page()