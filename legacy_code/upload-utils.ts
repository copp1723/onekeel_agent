'use client';

/**
 * Utility functions for file upload handling and validation
 */

export interface UploadResponse {
  upload_id: string;
  filename?: string;
  row_count?: number;
  column_count?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a CSV file for upload
 * @param file The file to validate
 * @returns Validation result with error message if invalid
 */
export function validateCsvFile(file: File): FileValidationResult {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      error: 'No file selected.'
    };
  }

  // Check file type
  if (!file.type && !file.name.endsWith('.csv')) {
    return {
      isValid: false,
      error: 'Please upload a CSV file.'
    };
  }
  
  if (file.type && file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    return {
      isValid: false,
      error: 'Only CSV files are supported.'
    };
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size exceeds the 10MB limit. Please upload a smaller file.'
    };
  }
  
  // Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'The file is empty. Please upload a file with data.'
    };
  }
  
  return { isValid: true };
}

/**
 * Uploads a file with progress tracking
 * @param file The file to upload
 * @param onProgress Progress callback (0-100)
 * @returns Promise with upload response
 */
export function uploadFileWithProgress(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  return new Promise(async (resolve, reject) => {
    // Validate file first
    const validation = validateCsvFile(file);
    if (!validation.isValid) {
      reject(new Error(validation.error));
      return;
    }
    
    // Perform a quick scan for potential issues before uploading
    try {
      const scanResult = await quickScanCsvForIssues(file);
      if (!scanResult.isValid) {
        reject(new Error(scanResult.error));
        return;
      }
    } catch (e) {
      // If scan fails, continue with upload (the server will validate)
      console.warn('CSV pre-scan failed, continuing with upload:', e);
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    
    // Set up progress tracking
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (e) {
          reject(new Error('Invalid response format'));
        }
      } else {
        let errorMessage = `Upload failed with status ${xhr.status}`;
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          if (errorResponse && errorResponse.error) {
            errorMessage = errorResponse.error;
          }
        } catch (e) {
          // Use default error message if parsing fails
        }
        reject(new Error(errorMessage));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred during upload'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });
    
    xhr.open('POST', '/api/upload', true);
    xhr.send(formData);
  });
}

/**
 * Performs a quick check of CSV data for common issues
 * @param file The CSV file to check
 * @returns Promise resolving to validation result
 */
export function quickScanCsvForIssues(file: File): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          resolve({ isValid: false, error: 'Could not read file content' });
          return;
        }
        
        // Quick check for empty file
        if (content.trim() === '') {
          resolve({ isValid: false, error: 'The file is empty' });
          return;
        }
        
        // Get the header row
        const lines = content.split('\n');
        if (lines.length < 2) {
          resolve({ isValid: false, error: 'The file contains no data rows' });
          return;
        }
        
        // Check for uneven column counts (possible unclosed quotes or delimiter issues)
        const headerCols = lines[0].split(',').length;
        let unevenColumns = false;
        
        // Check first 10 lines or all available lines
        const linesToCheck = Math.min(10, lines.length);
        for (let i = 1; i < linesToCheck; i++) {
          if (lines[i].trim() === '') continue;
          const colCount = lines[i].split(',').length;
          if (colCount !== headerCols) {
            unevenColumns = true;
            break;
          }
        }
        
        if (unevenColumns) {
          resolve({ 
            isValid: false, 
            error: 'The CSV file has inconsistent column counts, possibly due to unclosed quotes or incorrect delimiters' 
          });
          return;
        }
        
        // Check for potential integer columns with missing values
        // This is a basic check that looks for columns where some values are numeric
        // and others are empty
        const headerColumns = lines[0].split(',').map(h => h.trim());
        const potentialIssues: string[] = [];
        
        // Sample up to 20 data rows
        const sampleLines = lines.slice(1, Math.min(21, lines.length));
        
        // Transpose data to analyze by column
        const columns: string[][] = Array(headerColumns.length).fill(0).map(() => []);
        sampleLines.forEach(line => {
          if (line.trim() === '') return;
          const values = line.split(',');
          values.forEach((val, idx) => {
            if (idx < columns.length) {
              columns[idx].push(val.trim());
            }
          });
        });
        
        // Check each column for numeric + empty value patterns
        columns.forEach((colValues, colIdx) => {
          let hasNumeric = false;
          let hasEmpty = false;
          
          colValues.forEach(val => {
            if (val === '') {
              hasEmpty = true;
            } else if (!isNaN(Number(val)) && val !== '') {
              hasNumeric = true;
            }
          });
          
          if (hasNumeric && hasEmpty) {
            potentialIssues.push(`Column ${colIdx + 1} (${headerColumns[colIdx] || 'unnamed'}) has numeric values mixed with empty cells`);
          }
        });
        
        if (potentialIssues.length > 0) {
          resolve({
            isValid: false,
            error: `Potential data issues detected: ${potentialIssues[0]}. This may cause processing errors.`
          });
          return;
        }
        
        // If we got here, basic checks passed
        resolve({ isValid: true });
        
      } catch (error) {
        resolve({ isValid: true }); // Let the server do the full validation
      }
    };
    
    reader.onerror = () => {
      resolve({ isValid: false, error: 'Error reading the file' });
    };
    
    // Start reading the first portion of the file (up to 100KB)
    const slice = file.slice(0, 100000);
    reader.readAsText(slice);
  });
} 