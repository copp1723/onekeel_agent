#!/usr/bin/env python3
"""
PDF Parser Migration Test Script

This script verifies that the migration from the camelot-based PDF parser to the
TypeScript-based solution was successful.
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

# Try to import the new PDF parser
try:
    from legacy_code.new_pdf_parser import PDFParser
    NEW_PARSER_AVAILABLE = True
except ImportError:
    NEW_PARSER_AVAILABLE = False

# Try to import the old PDF parser if it exists
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'legacy_code'))
    from pdf_parser import PDFParser as OldPDFParser
    OLD_PARSER_AVAILABLE = True
except ImportError:
    OLD_PARSER_AVAILABLE = False

class TestResult:
    """Class to store test results."""
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.message = "Not run"
        self.details: Dict[str, Any] = {}
    
    def success(self, message: str = "Success", **details):
        self.passed = True
        self.message = message
        self.details.update(details)
    
    def fail(self, message: str, **details):
        self.passed = False
        self.message = message
        self.details.update(details)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "test": self.name,
            "passed": self.passed,
            "message": self.message,
            "details": self.details
        }

class PDFParserMigrationTester:
    """Class to test the PDF parser migration."""
    
    def __init__(self, test_pdf: Optional[str] = None):
        self.test_pdf = test_pdf or os.path.join(
            os.path.dirname(__file__), 
            "test-data", 
            "pdfs", 
            "table_sample.pdf"
        )
        self.results: List[TestResult] = []
    
    def run_tests(self) -> bool:
        """Run all tests and return True if all passed."""
        print("\n" + "=" * 70)
        print("PDF Parser Migration Test Suite")
        print("=" * 70 + "\n")
        
        # Run tests
        self.test_imports()
        self.test_parser_initialization()
        self.test_pdf_parsing()
        
        if OLD_PARSER_AVAILABLE:
            self.test_backward_compatibility()
        
        # Print summary
        self.print_summary()
        
        # Return True if all tests passed
        return all(result.passed for result in self.results)
    
    def test_imports(self):
        """Test if the new PDF parser can be imported."""
        test = TestResult("Import Test")
        
        if not NEW_PARSER_AVAILABLE:
            test.fail(
                "Failed to import the new PDF parser",
                error="ModuleNotFoundError: No module named 'legacy_code.new_pdf_parser'"
            )
            self.results.append(test)
            return
        
        test.success("Successfully imported the new PDF parser")
        self.results.append(test)
    
    def test_parser_initialization(self):
        """Test if the PDF parser can be initialized."""
        test = TestResult("Parser Initialization")
        
        if not NEW_PARSER_AVAILABLE:
            test.fail("Skipped - New PDF parser not available")
            self.results.append(test)
            return
        
        try:
            parser = PDFParser()
            test.success("Successfully initialized the PDF parser")
        except Exception as e:
            test.fail(
                "Failed to initialize the PDF parser",
                error=str(e),
                error_type=type(e).__name__
            )
        
        self.results.append(test)
    
    def test_pdf_parsing(self):
        """Test if the PDF parser can parse a PDF file."""
        test = TestResult("PDF Parsing")
        
        if not NEW_PARSER_AVAILABLE:
            test.fail("Skipped - New PDF parser not available")
            self.results.append(test)
            return
        
        if not os.path.exists(self.test_pdf):
            test.fail(
                "Test PDF not found",
                test_pdf=self.test_pdf,
                suggestion="Make sure the test PDF exists or provide a path with --test-pdf"
            )
            self.results.append(test)
            return
        
        try:
            parser = PDFParser()
            tables, results = parser.parse_file(self.test_pdf)
            
            if not isinstance(tables, list):
                test.fail(
                    "parse_file() did not return a list of tables",
                    returned_type=type(tables).__name__
                )
            elif not isinstance(results, dict):
                test.fail(
                    "parse_file() did not return a results dictionary",
                    returned_type=type(results).__name__
                )
            else:
                test.success(
                    "Successfully parsed the test PDF",
                    tables_found=len(tables),
                    results_keys=list(results.keys())
                )
                
                # Print the first few rows of the first table if available
                if tables and len(tables) > 0:
                    first_table = tables[0]
                    test.details["first_table_sample"] = str(first_table.head())
        
        except Exception as e:
            test.fail(
                "Failed to parse the test PDF",
                error=str(e),
                error_type=type(e).__name__,
                test_pdf=self.test_pdf
            )
        
        self.results.append(test)
    
    def test_backward_compatibility(self):
        """Test if the new parser is backward compatible with the old one."""
        test = TestResult("Backward Compatibility")
        
        if not NEW_PARSER_AVAILABLE or not OLD_PARSER_AVAILABLE:
            test.fail("Skipped - Both old and new parsers must be available")
            self.results.append(test)
            return
        
        if not os.path.exists(self.test_pdf):
            test.fail("Test PDF not found", test_pdf=self.test_pdf)
            self.results.append(test)
            return
        
        try:
            # Parse with old parser
            old_parser = OldPDFParser()
            old_tables, old_results = old_parser.parse_file(self.test_pdf)
            
            # Parse with new parser
            new_parser = PDFParser()
            new_tables, new_results = new_parser.parse_file(self.test_pdf)
            
            # Basic comparison
            if len(old_tables) != len(new_tables):
                test.fail(
                    "Number of tables does not match",
                    old_tables_count=len(old_tables),
                    new_tables_count=len(new_tables)
                )
            else:
                test.success(
                    "Basic backward compatibility check passed",
                    tables_count=len(new_tables),
                    note="The new parser may return different but equivalent results"
                )
        
        except Exception as e:
            test.fail(
                "Backward compatibility test failed",
                error=str(e),
                error_type=type(e).__name__
            )
        
        self.results.append(test)
    
    def print_summary(self):
        """Print a summary of the test results."""
        print("\n" + "=" * 70)
        print("Test Results")
        print("=" * 70)
        
        for result in self.results:
            status = "PASSED" if result.passed else "FAILED"
            print(f"\n[{status}] {result.name}")
            print(f"  {result.message}")
            
            # Print additional details if the test failed
            if not result.passed and result.details:
                print("  Details:")
                for key, value in result.details.items():
                    print(f"    {key}: {value}")
        
        # Print overall status
        passed = sum(1 for r in self.results if r.passed)
        total = len(self.results)
        print("\n" + "=" * 70)
        print(f"Summary: {passed}/{total} tests passed")
        print("=" * 70 + "\n")
    
    def get_results(self) -> List[Dict[str, Any]]:
        """Get the test results as a list of dictionaries."""
        return [result.to_dict() for result in self.results]

def main():
    """Main function to run the tests."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test the PDF parser migration')
    parser.add_argument(
        '--test-pdf', 
        type=str, 
        default=None,
        help='Path to a PDF file to use for testing (default: test-data/pdfs/table_sample.pdf)'
    )
    parser.add_argument(
        '--output', 
        type=str, 
        default=None,
        help='Output file to save the test results (JSON)'
    )
    
    args = parser.parse_args()
    
    # Run the tests
    tester = PDFParserMigrationTester(test_pdf=args.test_pdf)
    success = tester.run_tests()
    
    # Save results if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump({
                "success": success,
                "results": tester.get_results(),
                "test_pdf": args.test_pdf or "default"
            }, f, indent=2)
        print(f"Test results saved to {args.output}")
    
    # Return non-zero exit code if any test failed
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
