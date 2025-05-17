"""
Test harness for evaluating legacy data_parser.py compatibility with CRM report parsing.
"""

import os
import sys
import pandas as pd
import json
from pathlib import Path
from typing import Dict, Any, Optional, List

# Add parent directory to path to allow importing legacy_code as a package
sys.path.append(str(Path(__file__).parent))

# Import only the data_parser module which we know is available
LEGACY_IMPORTS_WORKING = True

try:
    from legacy_code.data_parser import DataParser, detect_file_type, DataParserResult
except ImportError as e:
    print(f"Error: Could not import data_parser: {e}")
    DataParser = None
    detect_file_type = None
    DataParserResult = None
    LEGACY_IMPORTS_WORKING = False

# Set other modules to None as we won't be testing them
DataNormalizer = None
ColumnMapper = None
DataSchemaApplier = None
PDFExtractor = None
extract_from_pdf = None

# Define a simple schema for testing
SAMPLE_SCHEMA = {
    "lead_id": {"type": "int", "required": True, "description": "Unique identifier for the lead"},
    "first_name": {"type": "str", "required": True, "description": "First name of the lead"},
    "last_name": {"type": "str", "required": True, "description": "Last name of the lead"},
    "email": {"type": "str", "required": True, "description": "Email address"},
    "phone": {"type": "str", "required": False, "description": "Phone number"},
    "company": {"type": "str", "required": False, "description": "Company name"},
    "status": {"type": "str", "required": True, "description": "Current status of the lead"},
    "source": {"type": "str", "required": False, "description": "How the lead was acquired"},
    "created_date": {"type": "date", "required": True, "description": "When the lead was created"},
    "last_contacted": {"type": "date", "required": False, "description": "Last contact date"},
    "notes": {"type": "str", "required": False, "description": "Additional notes"}
}

# Column mapping for testing
COLUMN_MAPPING = {
    "Lead ID": "lead_id",
    "First Name": "first_name",
    "Last Name": "last_name",
    "Email": "email",
    "Phone": "phone",
    "Company": "company",
    "Status": "status",
    "Source": "source",
    "Created Date": "created_date",
    "Last Contacted": "last_contacted",
    "Notes": "notes"
}

def test_parser_with_crm_sample(file_path: str) -> Optional[Dict[str, Any]]:
    """
    Test the legacy DataParser with a CRM sample file.
    
    Args:
        file_path: Path to the CRM sample file
        
    Returns:
        Dictionary with test results or None if test failed
    """
    if not LEGACY_IMPORTS_WORKING:
        print("Skipping test due to missing legacy imports")
        return None
        
    results = {
        "file_path": file_path,
        "file_type": None,
        "parse_success": False,
        "normalization_success": False,
        "mapping_success": False,
        "row_count": 0,
        "column_count": 0,
        "parse_errors": [],
        "normalization_errors": [],
        "mapping_errors": [],
        "sample_data": None
    }
    
    try:
        print(f"\n{'='*80}")
        print(f"Testing parser with: {file_path}")
        
        # 1. File Type Detection
        file_type = detect_file_type(file_path)
        results["file_type"] = file_type
        print(f"File type detected: {file_type}")
        
        # 2. File Content Inspection
        try:
            with open(file_path, 'rb') as f:
                content = f.read(1000)
                print(f"\nFile content preview:\n{content.decode('utf-8', errors='replace')[:500]}...")
        except Exception as e:
            error_msg = f"Error reading file: {str(e)}"
            print(error_msg)
            results["parse_errors"].append(error_msg)
        
        # 3. Initialize Parser with Debug Logging
        import logging
        logging.basicConfig(level=logging.INFO)  # Set to DEBUG for more verbose output
        logger = logging.getLogger('data_parser')
        logger.setLevel(logging.INFO)
        
        parser = DataParser()
        
        # 4. Parse the File
        print("\n=== 1. Testing File Parsing ===")
        result = None
        
        try:
            if file_type == 'csv':
                # Try with different encodings for CSV files
                encodings = ['utf-8', 'latin1', 'cp1252']
                
                for encoding in encodings:
                    print(f"\nTrying with encoding: {encoding}")
                    try:
                        # First try with pandas directly
                        df_test = pd.read_csv(file_path, encoding=encoding, on_bad_lines='warn')
                        print(f"✓ Successfully read CSV with {encoding} encoding")
                        print(f"Columns: {df_test.columns.tolist()}")
                        
                        # Then try with the legacy parser
                        result = parser.parse_file(file_path, encoding=encoding)
                        if result and hasattr(result, 'dataframe') and not result.dataframe.empty:
                            break
                    except Exception as e:
                        print(f"✗ Failed with {encoding}: {str(e)}")
                        continue
            
            # If we don't have a result yet, try with default parameters
            if result is None or not hasattr(result, 'dataframe') or result.dataframe is None or result.dataframe.empty:
                print("\nTrying with default parameters...")
                result = parser.parse_file(file_path)
            
            # 5. Check Parsing Results
            if hasattr(result, 'dataframe') and result.dataframe is not None:
                df = result.dataframe
                results["parse_success"] = True
                results["row_count"] = len(df)
                results["column_count"] = len(df.columns)
                
                print(f"\n✓ Successfully parsed file")
                print(f"- Rows: {results['row_count']}")
                print(f"- Columns: {results['column_count']}")
                print(f"- Columns: {df.columns.tolist()}")
                
                # Store a sample of the data
                results["sample_data"] = df.head(3).to_dict(orient='records')
                
                # 6. Test Data Normalization if available
                if DataNormalizer is not None:
                    print("\n=== 2. Testing Data Normalization ===")
                    try:
                        normalizer = DataNormalizer()
                        normalized_df, _ = normalizer.normalize_dataframe(df)
                        
                        if normalized_df is not None and not normalized_df.empty:
                            results["normalization_success"] = True
                            print("✓ Successfully normalized data")
                            print("Sample of normalized data:")
                            print(normalized_df.head(3).to_string())
                        else:
                            results["normalization_errors"].append("Normalization returned empty DataFrame")
                            print("✗ Normalization returned empty DataFrame")
                    except Exception as e:
                        error_msg = f"Error during normalization: {str(e)}"
                        results["normalization_errors"].append(error_msg)
                        print(f"✗ {error_msg}")
                        import traceback
                        traceback.print_exc()
                else:
                    print("\n=== 2. Data Normalization (Skipped - DataNormalizer not available) ===")
                    results["normalization_errors"].append("DataNormalizer not available")
                
                # 7. Test Column Mapping if available
                if ColumnMapper is not None:
                    print("\n=== 3. Testing Column Mapping ===")
                    try:
                        mapper = ColumnMapper()
                        
                        # Create a simple schema profile for testing
                        schema_columns = [
                            {"name": "lead_id", "type": "int", "required": True},
                            {"name": "first_name", "type": "str", "required": True},
                            {"name": "last_name", "type": "str", "required": True},
                            {"name": "email", "type": "str", "required": True},
                            {"name": "phone", "type": "str", "required": False},
                            {"name": "company", "type": "str", "required": False},
                            {"name": "status", "type": "str", "required": True},
                            {"name": "source", "type": "str", "required": False},
                            {"name": "created_date", "type": "date", "required": True},
                            {"name": "last_contacted", "type": "date", "required": False},
                            {"name": "notes", "type": "str", "required": False}
                        ]
                        
                        # Try to map columns
                        mappings, unmapped, suggestions = mapper.map_columns(
                            df.columns.tolist(), 
                            schema_columns
                        )
                        
                        if mappings:
                            results["mapping_success"] = True
                            print("✓ Successfully mapped columns")
                            print("Mappings:")
                            for mapping in mappings:
                                print(f"- {mapping.source_column} -> {mapping.target_column} (confidence: {mapping.confidence:.2f})")
                        else:
                            results["mapping_errors"].append("No column mappings were created")
                            print("✗ No column mappings were created")
                        
                        if unmapped:
                            print(f"\nUnmapped columns: {unmapped}")
                        
                        if suggestions:
                            print("\nMapping suggestions:")
                            for suggestion in suggestions:
                                print(f"- {suggestion.column}: {suggestion.suggestion} (reason: {suggestion.reason})")
                                
                    except Exception as e:
                        error_msg = f"Error during column mapping: {str(e)}"
                        results["mapping_errors"].append(error_msg)
                        print(f"✗ {error_msg}")
                        import traceback
                        traceback.print_exc()
                else:
                    print("\n=== 3. Column Mapping (Skipped - ColumnMapper not available) ===")
                    results["mapping_errors"].append("ColumnMapper not available")
                
            else:
                results["parse_errors"].append("No DataFrame was created or returned")
                print("✗ No DataFrame was created or returned")
            
            # 8. Report any errors
            if hasattr(result, 'errors') and result.errors:
                results["parse_errors"].extend(result.errors)
                print("\nParse errors encountered:")
                for error in result.errors:
                    print(f"- {error}")
        
        except Exception as e:
            error_msg = f"Error during parsing: {str(e)}"
            results["parse_errors"].append(error_msg)
            print(f"✗ {error_msg}")
            import traceback
            traceback.print_exc()
        
        return results
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"✗ {error_msg}")
        import traceback
        traceback.print_exc()
        results["parse_errors"].append(error_msg)
        return results

def generate_test_report(results: Dict[str, Any]) -> str:
    """Generate a markdown report from test results."""
    report = ["# CRM Parser Test Report", ""]
    
    # Summary
    report.append("## Test Summary")
    report.append(f"- **File:** {results['file_path']}")
    report.append(f"- **File Type:** {results['file_type']}")
    report.append(f"- **Parse Successful:** {'✅' if results['parse_success'] else '❌'}")
    
    if results['parse_success']:
        report.append(f"- **Rows:** {results['row_count']}")
        report.append(f"- **Columns:** {results['column_count']}")
        report.append(f"- **Normalization:** {'✅' if results['normalization_success'] else '❌'}")
        report.append(f"- **Column Mapping:** {'✅' if results['mapping_success'] else '❌'}")
    
    # Parse Details
    report.append("\n## Parse Details")
    if results['parse_errors']:
        report.append("### ❌ Parse Errors")
        for error in results['parse_errors']:
            report.append(f"- {error}")
    else:
        report.append("### ✅ Parse Successful")
    
    # Data Sample
    if results.get('sample_data'):
        report.append("\n### Sample Data")
        report.append("```json")
        report.append(json.dumps(results['sample_data'], indent=2))
        report.append("```")
    
    # Normalization Results
    if 'normalization_errors' in results and results['normalization_errors']:
        report.append("\n### ❌ Normalization Errors")
        for error in results['normalization_errors']:
            report.append(f"- {error}")
    
    # Mapping Results
    if 'mapping_errors' in results and results['mapping_errors']:
        report.append("\n### ❌ Mapping Errors")
        for error in results['mapping_errors']:
            report.append(f"- {error}")
    
    return "\n".join(report)

def main():
    """Main test function."""
    if not LEGACY_IMPORTS_WORKING:
        print("Error: Could not import all required legacy modules. Please check the imports.")
        return
    
    # Test with sample CRM files
    test_files = [
        "samples/crm_leads_clean.csv",  # Using the clean CSV file
        # "samples/crm_contacts.xlsx",  # Uncomment when you have these files
        # "samples/crm_report.pdf"
    ]
    
    # Create samples directory if it doesn't exist
    samples_dir = Path("samples")
    samples_dir.mkdir(exist_ok=True)
    
    # Check if sample files exist
    valid_test_files = []
    for test_file in test_files:
        if os.path.exists(test_file):
            valid_test_files.append(test_file)
        else:
            print(f"Sample file not found: {test_file}")
    
    if not valid_test_files:
        print("No test files found. Please add sample CRM files to the 'samples' directory.")
        return
    
    # Create reports directory
    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    
    # Run tests and generate reports
    all_results = []
    
    for test_file in valid_test_files:
        print(f"\n{'='*80}")
        print(f"RUNNING TEST FOR: {test_file}")
        print(f"{'='*80}")
        
        # Run the test
        results = test_parser_with_crm_sample(test_file)
        
        if results:
            all_results.append(results)
            
            # Generate and save report
            report = generate_test_report(results)
            report_file = reports_dir / f"{Path(test_file).stem}_report.md"
            
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            
            print(f"\n✅ Report generated: {report_file}")
    
    # Print summary
    if all_results:
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        for i, result in enumerate(all_results, 1):
            status = "✅" if result["parse_success"] else "❌"
            print(f"{i}. {status} {result['file_path']} - "
                  f"Parse: {'✅' if result['parse_success'] else '❌'}, "
                  f"Norm: {'✅' if result.get('normalization_success', False) else '❌'}, "
                  f"Map: {'✅' if result.get('mapping_success', False) else '❌'}")

if __name__ == "__main__":
    main()
