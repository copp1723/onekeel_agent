#!/usr/bin/env python3
"""
PDF Parser Migration Script

This script helps migrate from the old camelot-based PDF parser to the new TypeScript-based solution.
"""

import os
import sys
import argparse
import subprocess
import shutil
from pathlib import Path

def check_node_installed():
    """Check if Node.js is installed and meets version requirements."""
    try:
        # Check Node.js version
        result = subprocess.run(
            ["node", "--version"], 
            capture_output=True, 
            text=True
        )
        if result.returncode != 0:
            return False, "Node.js is not installed or not in PATH"
        
        # Parse version (format: v14.17.0)
        version_str = result.stdout.strip().lstrip('v')
        major_version = int(version_str.split('.')[0])
        
        if major_version < 14:
            return False, f"Node.js version {version_str} is too old. Version 14 or later is required."
            
        return True, f"Node.js {version_str} is installed"
        
    except Exception as e:
        return False, f"Error checking Node.js: {str(e)}"

def check_npm_installed():
    """Check if npm is installed."""
    try:
        result = subprocess.run(
            ["npm", "--version"], 
            capture_output=True, 
            text=True
        )
        if result.returncode != 0:
            return False, "npm is not installed or not in PATH"
            
        return True, f"npm {result.stdout.strip()} is installed"
        
    except Exception as e:
        return False, f"Error checking npm: {str(e)}"

def install_dependencies():
    """Install required Node.js dependencies."""
    try:
        print("Installing Node.js dependencies...")
        result = subprocess.run(
            ["npm", "install"], 
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=True, 
            text=True
        )
        
        if result.returncode != 0:
            return False, f"Failed to install dependencies: {result.stderr}"
            
        return True, "Dependencies installed successfully"
        
    except Exception as e:
        return False, f"Error installing dependencies: {str(e)}"

def build_typescript():
    """Build the TypeScript code."""
    try:
        print("Building TypeScript code...")
        result = subprocess.run(
            ["npm", "run", "build:ts"], 
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=True, 
            text=True
        )
        
        if result.returncode != 0:
            return False, f"Failed to build TypeScript: {result.stderr}"
            
        return True, "TypeScript code built successfully"
        
    except Exception as e:
        return False, f"Error building TypeScript: {str(e)}"

def backup_old_parser():
    """Backup the old PDF parser."""
    try:
        legacy_dir = os.path.join(os.path.dirname(__file__), "..", "legacy_code")
        old_parser = os.path.join(legacy_dir, "pdf_parser.py")
        backup_parser = os.path.join(legacy_dir, "pdf_parser.py.bak")
        
        if os.path.exists(old_parser) and not os.path.exists(backup_parser):
            print(f"Backing up old PDF parser to {backup_parser}...")
            shutil.copy2(old_parser, backup_parser)
            return True, f"Old PDF parser backed up to {backup_parser}"
        elif os.path.exists(backup_parser):
            return True, f"Backup already exists at {backup_parser}"
        else:
            return True, "No old PDF parser found to back up"
            
    except Exception as e:
        return False, f"Error backing up old PDF parser: {str(e)}"

def update_imports():
    """Update imports in Python files to use the new PDF parser."""
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        legacy_dir = os.path.join(project_root, "legacy_code")
        
        # Files that might contain PDF parser imports
        target_files = [
            os.path.join(legacy_dir, "upload.py"),
            # Add other files that import the PDF parser
        ]
        
        updated_files = 0
        
        for file_path in target_files:
            if not os.path.exists(file_path):
                continue
                
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Update import statements
            new_content = content.replace(
                'from legacy_code.pdf_parser import PDFParser',
                'from legacy_code.new_pdf_parser import PDFParser'
            )
            
            # Only write if changes were made
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                updated_files += 1
                print(f"Updated imports in {os.path.basename(file_path)}")
        
        return True, f"Updated imports in {updated_files} file(s)"
        
    except Exception as e:
        return False, f"Error updating imports: {str(e)}"

def run_tests():
    """Run tests to verify the migration was successful."""
    try:
        print("Running tests...")
        
        # Run the PDF parser test
        test_script = os.path.join(os.path.dirname(__file__), "..", "test_pdf_parser.py")
        test_pdf = os.path.join(os.path.dirname(__file__), "..", "test-data", "pdfs", "table_sample.pdf")
        
        if os.path.exists(test_script) and os.path.exists(test_pdf):
            result = subprocess.run(
                ["python", test_script, test_pdf],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("\nTest output:")
                print(result.stdout)
                return True, "Tests completed successfully"
            else:
                print("\nTest failed with output:")
                print(result.stderr)
                return False, "Tests failed"
        else:
            return True, "Test files not found, skipping tests"
            
    except Exception as e:
        return False, f"Error running tests: {str(e)}"

def main():
    """Main function to run the migration."""
    parser = argparse.ArgumentParser(description='Migrate from camelot-based PDF parser to TypeScript-based solution')
    parser.add_argument('--skip-tests', action='store_true', help='Skip running tests after migration')
    args = parser.parse_args()
    
    print("=" * 50)
    print("PDF Parser Migration Tool")
    print("=" * 50)
    
    # Check prerequisites
    print("\n[1/6] Checking prerequisites...")
    
    # Check Node.js
    node_ok, node_msg = check_node_installed()
    print(f"- Node.js: {node_msg}")
    if not node_ok:
        print("Error: Node.js is required for the new PDF parser")
        return 1
    
    # Check npm
    npm_ok, npm_msg = check_npm_installed()
    print(f"- npm: {npm_msg}")
    if not npm_ok:
        print("Error: npm is required for the new PDF parser")
        return 1
    
    # Install dependencies
    print("\n[2/6] Installing dependencies...")
    deps_ok, deps_msg = install_dependencies()
    print(f"- {deps_msg}")
    if not deps_ok:
        print("Error: Failed to install dependencies")
        return 1
    
    # Build TypeScript
    print("\n[3/6] Building TypeScript code...")
    build_ok, build_msg = build_typescript()
    print(f"- {build_msg}")
    if not build_ok:
        print("Error: Failed to build TypeScript code")
        return 1
    
    # Backup old parser
    print("\n[4/6] Backing up old PDF parser...")
    backup_ok, backup_msg = backup_old_parser()
    print(f"- {backup_msg}")
    if not backup_ok:
        print("Warning: Failed to back up old PDF parser")
    
    # Update imports
    print("\n[5/6] Updating imports...")
    update_ok, update_msg = update_imports()
    print(f"- {update_msg}")
    if not update_ok:
        print("Warning: Failed to update some imports")
    
    # Run tests
    if not args.skip_tests:
        print("\n[6/6] Running tests...")
        test_ok, test_msg = run_tests()
        print(f"- {test_msg}")
        if not test_ok:
            print("Warning: Tests failed, please verify the migration manually")
    else:
        print("\n[6/6] Skipping tests (--skip-tests flag used)")
    
    print("\n" + "=" * 50)
    print("Migration completed!")
    print("=" * 50)
    print("\nNext steps:")
    print("1. Test your application with various PDF files")
    print("2. Check the logs for any warnings or errors")
    print("3. If everything works as expected, you can remove the old PDF parser backup")
    print("   (legacy_code/pdf_parser.py.bak) if you don't need it anymore")
    print("\nFor more information, see the documentation in PDF_EXTRACTION_README.md")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
