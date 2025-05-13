"""
Data insights module for handling data processing and validation.
"""

from typing import Any, Dict, Optional, Tuple

import pandas as pd
import streamlit as st
import logging

# Set up fallback logger in case imports fail
logger = logging.getLogger(__name__)

# Try to import custom logging, fallback to standard logging
try:
    from watchdog_ai.logging import get_logger
    logger = get_logger(__name__)
except ImportError:
    # Configure basic logging if custom logging is not available
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger.info("Using standard Python logging (watchdog_ai.logging not available)")

# Define fallback SessionKeys if import fails
class FallbackSessionKeys:
    UPLOADED_DATA = "uploaded_data"

# Try to import SessionKeys, fallback to our implementation
try:
    from .config import SessionKeys
except ImportError:
    logger.warning("Could not import SessionKeys, using fallback implementation")
    SessionKeys = FallbackSessionKeys


def handle_upload(uploaded_file) -> Tuple[bool, str]:
    """
    Handle file upload with proper data type conversion for Streamlit/Arrow serialization.

    Args:
        uploaded_file: Streamlit UploadedFile object

    Returns:
        Tuple of (success: bool, message: str)
    """
    if not uploaded_file:
        logger.error("No file provided to handle_upload")
        return False, "No file was provided for upload"
        
    try:
        # Start with safety check for attribute access
        file_name = getattr(uploaded_file, 'name', 'unknown_file')
        file_type = getattr(uploaded_file, 'type', 'unknown_type')
        file_size = getattr(uploaded_file, 'size', 0)
        
        logger.debug(
            "Starting file upload process",
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
        )
    except Exception as e:
        # Handle case where uploaded_file doesn't have expected attributes
        logger.error("Invalid file object provided", error=str(e))
        return False, "Invalid file object. Please try uploading again."

    # Step 1: Read the file
    try:
        logger.debug("Reading CSV file")
        df = pd.read_csv(uploaded_file)
        if df.empty:
            logger.warning("Uploaded file contains no data")
            return False, "The uploaded file contains no data. Please check the file and try again."
            
        logger.info("CSV file read successfully", rows=len(df), columns=len(df.columns))
    except pd.errors.ParserError as e:
        logger.error("CSV parsing error", error=str(e), exc_info=True)
        return False, f"Unable to parse the CSV file: {str(e)}. Please check the file format."
    except pd.errors.EmptyDataError:
        logger.error("Empty data error - file contains no data")
        return False, "The uploaded file contains no data. Please check the file and try again."
    except Exception as e:
        logger.error("Error reading file", error=str(e), exc_info=True)
        return False, f"Error reading the file: {str(e)}. Please try a different file or format."

    # Step 2: Type conversion for Arrow serialization
    try:
        # Convert object columns to string to fix Arrow serialization
        object_cols = df.select_dtypes(include=["object"]).columns
        logger.debug("Converting object columns to string type", object_columns=list(object_cols))
        
        for col in object_cols:
            try:
                df[col] = df[col].astype("string")
            except Exception as col_e:
                logger.warning(
                    "Could not convert column to string type, trying with errors='ignore'", 
                    column=col, 
                    error=str(col_e)
                )
                # Try again with error handling
                df[col] = df[col].astype(str).astype("string")
    except Exception as e:
        logger.error("Error converting object columns to strings", error=str(e), exc_info=True)
        return False, f"Error preparing data for analysis: {str(e)}. The file may contain incompatible data types."

    # Step 3: Convert date columns
    try:
        # Convert date columns if they exist
        date_cols = [
            col for col in df.columns if any(term in col.lower() for term in ["date", "time", "month", "year"])
        ]
        logger.debug("Identified potential date columns", date_columns=date_cols)
        
        for col in date_cols:
            try:
                df[col] = pd.to_datetime(df[col])
            except Exception as e:
                logger.warning("Could not convert column to datetime", column=col, error=str(e))
    except Exception as e:
        # This is non-fatal, we can continue without date conversion
        logger.warning("Error during date column conversion", error=str(e))

    # Step 4: Store in session state
    try:
        # Make sure SessionKeys is properly initialized
        upload_key = getattr(SessionKeys, 'UPLOADED_DATA', 'uploaded_data')
        
        # Store in session state
        st.session_state[upload_key] = df
        
        # Create success message
        success_message = f"Successfully loaded {len(df)} rows with {len(df.columns)} columns"
        logger.info("File upload successful", rows=len(df), columns=len(df.columns), file_name=getattr(uploaded_file, 'name', 'unknown_file'))
        
        return (
            True,
            success_message,
        )
    except Exception as e:
        logger.error(
            "Error storing data in session state",
            error=str(e),
            exc_info=True
        )
        # This is likely an Arrow serialization error
        if "Arrow" in str(e) or "pyarrow" in str(e):
            return False, "Error storing data: Arrow serialization failed. This usually happens with complex data types. Try simplifying your data or using a different format."
        return False, f"Error finalizing upload: {str(e)}"


def validate_data(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Validate uploaded data and return summary.

    Args:
        df: DataFrame to validate

    Returns:
        Dictionary with validation results
    """
    logger.debug("Starting data validation", rows=len(df), columns=len(df.columns))

    try:
        summary = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": df.columns.tolist(),
            "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": {col: int(df[col].isna().sum()) for col in df.columns},
            "sample_values": {col: df[col].head().tolist() for col in df.columns},
        }

        # Check for critical issues like empty dataframe or all missing values
        validation_issues = []

        if len(df) == 0:
            issue = "Dataframe is empty"
            validation_issues.append(issue)
            logger.warning("Validation issue detected", issue=issue)

        for col, missing in summary["missing_values"].items():
            if missing == len(df):
                issue = f"Column '{col}' has all missing values"
                validation_issues.append(issue)
                logger.warning("Validation issue detected", issue=issue, column=col)

        if validation_issues:
            summary["issues"] = validation_issues
            logger.info("Data validation completed with issues", issue_count=len(validation_issues))
        else:
            logger.info("Data validation completed successfully")

        return summary

    except Exception as e:
        error_message = f"Error during data validation: {str(e)}"
        logger.error("Validation failed", error=str(e), exc_info=True)
        return {
            "error": error_message,
            "row_count": len(df) if isinstance(df, pd.DataFrame) else 0,
        }
