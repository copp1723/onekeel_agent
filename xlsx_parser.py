import pandas as pd
import os
import warnings
import logging
from typing import Dict, Any, List, Optional, Union, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def detect_sheet_names(file_path: str) -> List[str]:
    """
    Detect all sheet names in an Excel file.

    Args:
        file_path: Path to the Excel file

    Returns:
        List of sheet names
    """
    try:
        excel_file = pd.ExcelFile(file_path)
        return excel_file.sheet_names
    except Exception as e:
        logger.error(f"Error detecting sheet names: {str(e)}")
        return []

def get_sheet_preview(file_path: str, sheet_name: Optional[str] = None, nrows: int = 5) -> Dict[str, Any]:
    """
    Get a preview of a specific sheet or the first sheet in an Excel file.

    Args:
        file_path: Path to the Excel file
        sheet_name: Name of the sheet to preview (default: first sheet)
        nrows: Number of rows to preview

    Returns:
        Dictionary with sheet information and preview data
    """
    try:
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names

        if not sheet_names:
            return {"error": "No sheets found in the Excel file"}

        # Use the specified sheet or default to the first sheet
        target_sheet = sheet_name if sheet_name and sheet_name in sheet_names else sheet_names[0]

        # Read a sample of the sheet
        df_sample = pd.read_excel(file_path, sheet_name=target_sheet, nrows=nrows)

        return {
            "sheet_name": target_sheet,
            "all_sheets": sheet_names,
            "columns": list(df_sample.columns),
            "preview_rows": df_sample.head(nrows).to_dict(orient="records"),
            "row_count_preview": len(df_sample)
        }
    except Exception as e:
        logger.error(f"Error getting sheet preview: {str(e)}")
        return {"error": str(e)}

def parse_xlsx(
    file_path: str,
    sheet_name: Optional[Union[str, int, List[str], List[int]]] = 0,
    header: Union[int, List[int]] = 0,
    skiprows: Optional[Union[int, List[int]]] = None,
    usecols: Optional[Union[List[str], List[int]]] = None,
    na_values: Optional[List[str]] = None,
    keep_default_na: bool = True,
    dtype: Optional[Dict] = None,
    engine: str = 'openpyxl',
    convert_formulas: bool = True
) -> Union[pd.DataFrame, Dict[str, pd.DataFrame]]:
    """
    Parse an XLSX file with robust handling of different data types, formulas, and formatting issues.

    Args:
        file_path: Path to the Excel file
        sheet_name: Sheet name(s) or index(es) to parse. 0 by default (first sheet).
                   If None, parse all sheets. Can be a list to parse multiple sheets.
        header: Row number(s) to use as column names
        skiprows: Rows to skip at the beginning (0-indexed)
        usecols: Columns to parse (can be column names or indices)
        na_values: Additional strings to recognize as NA/NaN
        keep_default_na: Whether to include the default NaN values
        dtype: Data type for data or columns
        engine: Excel engine to use ('openpyxl' recommended for xlsx)
        convert_formulas: Whether to convert formulas to their calculated values

    Returns:
        If sheet_name is a str or int, returns a DataFrame.
        If sheet_name is a list or None, returns a dict of DataFrames with sheet names as keys.
    """
    try:
        # Verify file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Excel file not found: {file_path}")

        # Verify file is an Excel file
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext not in ['.xlsx', '.xls']:
            raise ValueError(f"File is not an Excel file: {file_path}")

        # Handle formula conversion
        # When convert_formulas is True, data_only=True tells openpyxl to return calculated values
        read_excel_kwargs = {
            'sheet_name': sheet_name,
            'header': header,
            'skiprows': skiprows,
            'usecols': usecols,
            'na_values': na_values,
            'keep_default_na': keep_default_na,
            'dtype': dtype,
            'engine': engine
        }

        # For openpyxl engine, we can use data_only parameter
        # Note: data_only=True doesn't always work for formulas in files created programmatically
        # For proper formula calculation, the file needs to be saved and then reopened
        if engine == 'openpyxl' and convert_formulas:
            read_excel_kwargs['engine_kwargs'] = {'data_only': True}

        # Suppress specific warnings that might occur during parsing
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")
            df = pd.read_excel(file_path, **read_excel_kwargs)

        # Log successful parsing
        if isinstance(df, pd.DataFrame):
            logger.info(f"Successfully parsed Excel file: {file_path}, sheet: {sheet_name}, rows: {len(df)}")
        else:
            sheet_info = ", ".join([f"{sheet}: {len(df[sheet])} rows" for sheet in df.keys()])
            logger.info(f"Successfully parsed Excel file: {file_path}, sheets: {sheet_info}")

        return df

    except Exception as e:
        logger.error(f"Error parsing Excel file {file_path}: {str(e)}")
        raise RuntimeError(f"Failed to parse Excel file: {str(e)}")

def parse_xlsx_to_dict(
    file_path: str,
    sheet_name: Optional[Union[str, int]] = 0,
    **kwargs
) -> Dict[str, Any]:
    """
    Parse an XLSX file and return a dictionary with metadata and the parsed DataFrame.

    Args:
        file_path: Path to the Excel file
        sheet_name: Sheet name or index to parse
        **kwargs: Additional arguments to pass to parse_xlsx

    Returns:
        Dictionary with metadata and the parsed DataFrame
    """
    try:
        # Get all sheet names for metadata
        excel_file = pd.ExcelFile(file_path)
        all_sheets = excel_file.sheet_names

        # Parse the specified sheet
        df = parse_xlsx(file_path, sheet_name=sheet_name, **kwargs)

        # Create result dictionary
        result = {
            "data": df,
            "metadata": {
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "sheet_name": sheet_name if isinstance(sheet_name, (str, int)) else "multiple",
                "all_sheets": all_sheets,
                "row_count": len(df),
                "column_count": len(df.columns),
                "columns": list(df.columns)
            }
        }

        return result

    except Exception as e:
        logger.error(f"Error in parse_xlsx_to_dict for {file_path}: {str(e)}")
        return {
            "data": None,
            "metadata": {
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "error": str(e)
            }
        }
