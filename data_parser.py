import pandas as pd
import chardet
import csv
import os
import logging
from typing import Dict, Any, List, Tuple
from xlsx_parser import parse_xlsx, detect_sheet_names

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import PDF parser if available
try:
    from legacy_code.new_pdf_parser import PDFParser
    PDF_PARSING_AVAILABLE = True
except ImportError:
    PDF_PARSING_AVAILABLE = False
    logger.warning("PDF parsing is not available. Install required dependencies for PDF support.")

def detect_file_type(file_path: str) -> str:
    """
    Detect the type of file based on its extension.

    Args:
        file_path: Path to the file

    Returns:
        File type as string ('csv', 'xlsx', 'xls', 'pdf', or 'unknown')
    """
    file_ext = os.path.splitext(file_path)[1].lower()
    if file_ext in ['.csv', '.txt']:
        return 'csv'
    elif file_ext == '.xlsx':
        return 'xlsx'
    elif file_ext == '.xls':
        return 'xls'
    elif file_ext == '.pdf':
        return 'pdf'
    else:
        return 'unknown'

def detect_encoding(file_path, sample_size=10000):
    """Detect file encoding using chardet."""
    with open(file_path, 'rb') as f:
        rawdata = f.read(sample_size)
    result = chardet.detect(rawdata)
    return result['encoding'] or 'utf-8'

def parse_csv(file_path, delimiter=None):
    """
    Parse a CSV file with robust encoding detection and flexible delimiter handling.
    Handles quoted fields and common edge cases.

    Args:
        file_path: Path to the CSV file
        delimiter: CSV delimiter character (if None, will be auto-detected)

    Returns:
        Pandas DataFrame containing the parsed data
    """
    encoding = detect_encoding(file_path)
    # Try to infer delimiter if not provided
    if delimiter is None:
        with open(file_path, 'r', encoding=encoding) as f:
            sample = f.read(4096)
        sniffer = csv.Sniffer()
        try:
            dialect = sniffer.sniff(sample)
            delimiter = dialect.delimiter
        except Exception:
            delimiter = ','  # fallback

    try:
        df = pd.read_csv(
            file_path,
            encoding=encoding,
            delimiter=delimiter,
            quoting=csv.QUOTE_MINIMAL,
            on_bad_lines='skip',  # skip malformed rows
            engine='python',      # better for weird CSVs
        )
    except Exception as e:
        raise RuntimeError(f"Failed to parse CSV: {e}")

    return df

def parse_pdf(file_path: str, pages: str = "all") -> pd.DataFrame:
    """
    Parse a PDF file with tables using the TypeScript-based PDF extraction adapter.

    Args:
        file_path: Path to the PDF file
        pages: Pages to extract tables from (e.g., "1,3,4-10" or "all")

    Returns:
        Pandas DataFrame containing the parsed data (first table by default)
    """
    if not PDF_PARSING_AVAILABLE:
        raise ImportError("PDF parsing is not available. Install required dependencies.")

    try:
        # Initialize the PDF parser
        parser = PDFParser()

        # Parse the PDF file
        logger.info(f"Parsing PDF file: {file_path}")
        tables, results = parser.parse_file(file_path, pages=pages)

        # Log extraction results
        logger.info(f"PDF extraction results: {results['tables_found']} tables found, "
                   f"method: {results['extraction_method']}, "
                   f"score: {results['extraction_score']}")

        if not tables:
            logger.warning("No tables found in the PDF file")
            # Return an empty DataFrame with a message
            return pd.DataFrame({"message": ["No tables found in the PDF file"]})

        # Return the first table by default
        # In a more advanced implementation, you might want to return all tables
        # or let the user choose which table to use
        return tables[0]

    except Exception as e:
        logger.error(f"Error parsing PDF file: {str(e)}")
        raise RuntimeError(f"Failed to parse PDF: {e}")

def parse_file(file_path: str, **kwargs) -> pd.DataFrame:
    """
    Parse a file based on its type (CSV, XLSX, XLS, PDF).

    Args:
        file_path: Path to the file
        **kwargs: Additional arguments to pass to the specific parser

    Returns:
        Pandas DataFrame containing the parsed data
    """
    file_type = detect_file_type(file_path)

    if file_type == 'csv':
        return parse_csv(file_path, **kwargs)
    elif file_type in ['xlsx', 'xls']:
        return parse_xlsx(file_path, **kwargs)
    elif file_type == 'pdf':
        return parse_pdf(file_path, **kwargs)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

def get_file_info(file_path: str) -> Dict[str, Any]:
    """
    Get information about a file without fully parsing it.

    Args:
        file_path: Path to the file

    Returns:
        Dictionary with file information
    """
    file_type = detect_file_type(file_path)
    file_info = {
        "file_path": file_path,
        "file_name": os.path.basename(file_path),
        "file_type": file_type,
        "file_size": os.path.getsize(file_path)
    }

    if file_type == 'csv':
        # For CSV, get encoding and sample first few rows
        encoding = detect_encoding(file_path)
        file_info["encoding"] = encoding

        # Get column names from first row
        try:
            df_sample = pd.read_csv(file_path, encoding=encoding, nrows=1)
            file_info["columns"] = list(df_sample.columns)
        except Exception as e:
            file_info["error"] = str(e)

    elif file_type in ['xlsx', 'xls']:
        # For Excel files, get sheet names
        try:
            sheet_names = detect_sheet_names(file_path)
            file_info["sheets"] = sheet_names

            # Get column names from first sheet if available
            if sheet_names:
                df_sample = pd.read_excel(file_path, sheet_name=sheet_names[0], nrows=1)
                file_info["columns"] = list(df_sample.columns)
        except Exception as e:
            file_info["error"] = str(e)

    elif file_type == 'pdf':
        # For PDF files, use the new PDF parser to get file info
        if PDF_PARSING_AVAILABLE:
            try:
                parser = PDFParser()
                pdf_info = parser.get_file_info(file_path)

                # Add PDF-specific information to the file_info dictionary
                file_info.update({
                    "page_count": pdf_info.get("page_count", 0),
                    "has_tables": pdf_info.get("has_tables", False),
                    "table_count": pdf_info.get("table_count", 0),
                    "extraction_method": pdf_info.get("extraction_method", "unknown")
                })

                # Add a sample of the first table if available
                if "table_sample" in pdf_info:
                    file_info["table_sample"] = pdf_info["table_sample"]

            except Exception as e:
                file_info["error"] = f"Error getting PDF information: {str(e)}"
                logger.error(f"Error getting PDF information: {str(e)}")
        else:
            file_info["error"] = "PDF parsing is not available. Install required dependencies."

    return file_info
