import os
import pandas as pd
import tempfile
from data_parser import parse_file, get_file_info

def create_test_xlsx():
    """Create a test XLSX file with sample data."""
    # Create a sample DataFrame
    data = {
        'Name': ['John', 'Alice', 'Bob', 'Carol', 'Dave'],
        'Age': [28, 24, 32, 45, 31],
        'Department': ['IT', 'HR', 'Finance', 'Marketing', 'IT'],
        'Salary': [75000, 65000, 85000, 72000, 78000],
        'Start Date': pd.date_range(start='2020-01-01', periods=5, freq='M')
    }
    df = pd.DataFrame(data)

    # Create a temporary file
    fd, temp_path = tempfile.mkstemp(suffix='.xlsx')
    os.close(fd)

    # Create a test Excel file with multiple sheets
    with pd.ExcelWriter(temp_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Employees', index=False)

        # Create a sheet with formulas
        df_formulas = pd.DataFrame({
            'A': [1, 2, 3, 4, 5],
            'B': [10, 20, 30, 40, 50],
            'C': [11, 22, 33, 44, 55]  # Pre-calculated values (A+B)
        })
        df_formulas.to_excel(writer, sheet_name='Formulas', index=False)

        # Note: Excel formulas in files created programmatically often don't calculate properly
        # when read back. For a real-world file with formulas, the calculation would work better.

        # Create a sheet with different data types
        df_types = pd.DataFrame({
            'Text': ['abc', 'def', 'ghi', 'jkl', 'mno'],
            'Integer': [1, 2, 3, 4, 5],
            'Float': [1.1, 2.2, 3.3, 4.4, 5.5],
            'Date': pd.date_range(start='2021-01-01', periods=5),
            'Boolean': [True, False, True, False, True]
        })
        df_types.to_excel(writer, sheet_name='DataTypes', index=False)

    return temp_path

def test_parse_xlsx():
    """Test parsing an XLSX file."""
    # Create a test XLSX file
    test_file = create_test_xlsx()
    print(f"Created test file: {test_file}")

    try:
        # Get file info
        file_info = get_file_info(test_file)
        print("\nFile Info:")
        print(f"File name: {file_info['file_name']}")
        print(f"File type: {file_info['file_type']}")
        print(f"Sheets: {file_info.get('sheets', [])}")
        print(f"Columns in first sheet: {file_info.get('columns', [])}")

        # Parse the first sheet (default)
        print("\nParsing first sheet (default):")
        df = parse_file(test_file)
        print(f"Shape: {df.shape}")
        print(df.head())

        # Parse a specific sheet by name
        print("\nParsing 'DataTypes' sheet:")
        df_types = parse_file(test_file, sheet_name='DataTypes')
        print(f"Shape: {df_types.shape}")
        print(df_types.head())

        # Parse a specific sheet with formulas
        print("\nParsing 'Formulas' sheet:")
        df_formulas = parse_file(test_file, sheet_name='Formulas')
        print(f"Shape: {df_formulas.shape}")
        print(df_formulas.head())

        # Parse all sheets
        print("\nParsing all sheets:")
        all_sheets = parse_file(test_file, sheet_name=None)
        for sheet_name, sheet_df in all_sheets.items():
            print(f"\nSheet: {sheet_name}")
            print(f"Shape: {sheet_df.shape}")
            print(sheet_df.head(2))

    finally:
        # Clean up the test file
        if os.path.exists(test_file):
            os.remove(test_file)
            print(f"\nRemoved test file: {test_file}")

if __name__ == "__main__":
    test_parse_xlsx()
