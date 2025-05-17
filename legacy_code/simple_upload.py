#!/usr/bin/env python3
"""
Simple upload processor for CSV files.
This is a simplified version that doesn't depend on external modules.
"""

import sys
import os
import json
import uuid
import time

def process_file(file_path):
    """
    Process a CSV file and return basic information about it.
    """
    # Check if file exists
    if not os.path.exists(file_path):
        return {
            "error": f"File not found: {file_path}"
        }
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Count lines in the file
    line_count = 0
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for _ in f:
            line_count += 1
    
    # Generate a unique ID for this upload
    upload_id = str(uuid.uuid4())
    
    # Return results
    return {
        "upload_id": upload_id,
        "file_name": os.path.basename(file_path),
        "file_size": file_size,
        "line_count": line_count,
        "timestamp": time.time()
    }

if __name__ == "__main__":
    # Check if file path is provided
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = process_file(file_path)
    
    # Output as JSON
    print(json.dumps(result))
