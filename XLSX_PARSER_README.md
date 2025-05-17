# XLSX Parser Documentation

This document provides information about the XLSX parsing functionality implemented in the project.

## Overview

The XLSX parser provides robust functionality for parsing Excel files (both `.xlsx` and `.xls` formats) with support for:

- Multiple sheets
- Different data types (text, numbers, dates, formulas)
- Handling formatting issues
- Integration with the unified parser interface

## Files

- `xlsx_parser.py`: Contains the core XLSX parsing functionality
- `data_parser.py`: Provides a unified interface for parsing different file types

## Dependencies

The XLSX parser relies on the following libraries:

- `pandas`: For data manipulation and analysis
- `openpyxl`: Engine for parsing XLSX files (used by pandas)

To install the required dependencies:

```bash
pip install pandas openpyxl
```

## Usage Examples

### Basic Usage

```python
from data_parser import parse_file

# Parse the first sheet of an Excel file
df = parse_file('path/to/your/file.xlsx')

# Parse a specific sheet by name
df = parse_file('path/to/your/file.xlsx', sheet_name='Sheet2')

# Parse all sheets (returns a dictionary of DataFrames)
all_sheets = parse_file('path/to/your/file.xlsx', sheet_name=None)
```

### Advanced Options

```python
from data_parser import parse_file

# Specify header row (0-indexed)
df = parse_file('path/to/your/file.xlsx', header=2)

# Skip rows
df = parse_file('path/to/your/file.xlsx', skiprows=[0, 1])

# Select specific columns
df = parse_file('path/to/your/file.xlsx', usecols=['A', 'C', 'E'])

# Handle NA values
df = parse_file('path/to/your/file.xlsx', na_values=['N/A', 'NA', '-'])
```

### Getting File Information

```python
from data_parser import get_file_info

# Get information about an Excel file
file_info = get_file_info('path/to/your/file.xlsx')
print(file_info['sheets'])  # List of sheet names
print(file_info['columns'])  # Columns in the first sheet
```

## XLSX Parser Functions

### `parse_xlsx(file_path, sheet_name=0, ...)`

Parses an XLSX file with robust handling of different data types, formulas, and formatting issues.

**Parameters:**
- `file_path`: Path to the Excel file
- `sheet_name`: Sheet name(s) or index(es) to parse. 0 by default (first sheet)
- `header`: Row number(s) to use as column names
- `skiprows`: Rows to skip at the beginning (0-indexed)
- `usecols`: Columns to parse (can be column names or indices)
- `na_values`: Additional strings to recognize as NA/NaN
- `keep_default_na`: Whether to include the default NaN values
- `dtype`: Data type for data or columns
- `engine`: Excel engine to use ('openpyxl' recommended for xlsx)
- `convert_formulas`: Whether to convert formulas to their calculated values

**Returns:**
- If `sheet_name` is a str or int, returns a DataFrame
- If `sheet_name` is a list or None, returns a dict of DataFrames with sheet names as keys

### `detect_sheet_names(file_path)`

Detects all sheet names in an Excel file.

**Parameters:**
- `file_path`: Path to the Excel file

**Returns:**
- List of sheet names

### `get_sheet_preview(file_path, sheet_name=None, nrows=5)`

Gets a preview of a specific sheet or the first sheet in an Excel file.

**Parameters:**
- `file_path`: Path to the Excel file
- `sheet_name`: Name of the sheet to preview (default: first sheet)
- `nrows`: Number of rows to preview

**Returns:**
- Dictionary with sheet information and preview data

## Handling Different Data Types

The XLSX parser handles various data types:

- **Text**: Parsed as strings
- **Numbers**: Parsed as integers or floats
- **Dates**: Parsed as datetime objects
- **Formulas**: Can be parsed as their calculated values (when `convert_formulas=True`)
- **Boolean**: Parsed as boolean values

## Error Handling

The parser includes robust error handling:

- File not found errors
- Invalid file format errors
- Sheet not found errors
- Formula calculation errors

All errors are logged and propagated with clear error messages.

## Testing

A test script (`test_xlsx_parser.py`) is provided to verify the functionality of the XLSX parser. Run it with:

```bash
python test_xlsx_parser.py
```

This will create a temporary XLSX file with multiple sheets and different data types, parse it, and display the results.
