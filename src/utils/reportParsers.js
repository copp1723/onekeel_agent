/**
 * Report Parsers
 * 
 * Collection of utilities for parsing various report formats from CRM vendors
 * Supports CSV, Excel/XLSX, and PDF formats with appropriate transformations
 */

import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import pdfParse from 'pdf-parse';

/**
 * Parse CSV report file
 * 
 * @param {string} filePath - Path to the CSV file
 * @returns {Array} - Array of objects representing rows
 */
export function parseCSV(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV with header row
    const records = csvParse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Parsed ${records.length} records from CSV file: ${path.basename(filePath)}`);
    return records;
  } catch (error) {
    console.error(`Error parsing CSV file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Parse Excel/XLSX report file
 * 
 * @param {string} filePath - Path to the Excel file
 * @param {Array} sheetNames - Optional array of sheet names to parse
 * @returns {Array} - Array of objects representing rows
 */
export function parseExcel(filePath, sheetNames = null) {
  try {
    const workbook = new ExcelJS.Workbook();
    const result = [];
    
    // Load workbook
    return workbook.xlsx.readFile(filePath)
      .then(() => {
        // Determine which sheets to parse
        let sheetsToProcess = [];
        if (sheetNames && Array.isArray(sheetNames)) {
          // Use specified sheets
          sheetsToProcess = sheetNames.map(name => workbook.getWorksheet(name)).filter(Boolean);
        } else {
          // Use all sheets
          sheetsToProcess = workbook.worksheets;
        }
        
        // Process each sheet
        sheetsToProcess.forEach(worksheet => {
          console.log(`Processing sheet: ${worksheet.name}`);
          
          // Get headers from first row
          const headers = [];
          worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber - 1] = cell.value ? cell.value.toString().trim() : `Column${colNumber}`;
          });
          
          // Process data rows
          worksheet.eachRow((row, rowNumber) => {
            // Skip header row
            if (rowNumber === 1) return;
            
            const record = {};
            row.eachCell((cell, colNumber) => {
              const header = headers[colNumber - 1];
              if (!header) return;
              
              let value = cell.value;
              
              // Handle different cell types
              if (cell.type === ExcelJS.ValueType.Date) {
                value = cell.value.toISOString().split('T')[0];
              } else if (typeof value === 'object' && value !== null) {
                // Handle formula cells
                if (value.result !== undefined) {
                  value = value.result;
                } else if (value.text !== undefined) {
                  value = value.text;
                } else if (value.richText !== undefined) {
                  value = value.richText.map(rt => rt.text).join('');
                }
              }
              
              record[header] = value;
            });
            
            // Only add records that have data
            if (Object.keys(record).length > 0) {
              result.push(record);
            }
          });
        });
        
        console.log(`Parsed ${result.length} records from Excel file: ${path.basename(filePath)}`);
        return result;
      });
  } catch (error) {
    console.error(`Error parsing Excel file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Parse PDF report file
 * 
 * @param {string} filePath - Path to the PDF file
 * @returns {Array} - Array of objects representing extracted data
 */
export async function parsePDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    // Extract text content
    const text = pdfData.text;
    console.log(`Extracted ${text.length} characters from PDF file: ${path.basename(filePath)}`);
    
    // PDF parsing is more complex and vendor-specific
    // This is a simplified implementation that extracts tabular data
    return extractTabularDataFromPDF(text);
  } catch (error) {
    console.error(`Error parsing PDF file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Extract tabular data from PDF text content
 * This is a simplified approach - real-world PDF parsing is more complex
 * and would require more sophisticated techniques for each vendor
 */
function extractTabularDataFromPDF(text) {
  try {
    // Split text into lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Try to identify header row (this is a simple heuristic)
    let headerLine = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      // Check if line has multiple words with capital letters
      const words = lines[i].split(/\s+/);
      if (words.length >= 3 && words.filter(w => /^[A-Z]/.test(w)).length >= 3) {
        headerLine = i;
        break;
      }
    }
    
    if (headerLine === -1) {
      console.warn('Could not identify header row in PDF. Using first line as header.');
      headerLine = 0;
    }
    
    // Extract headers
    const headers = lines[headerLine]
      .split(/\s{2,}/)
      .map(h => h.trim())
      .filter(h => h.length > 0);
    
    // Extract data rows
    const records = [];
    for (let i = headerLine + 1; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines that are too short
      if (line.length < 10) continue;
      
      // Try to extract values
      const values = line.split(/\s{2,}/).map(v => v.trim()).filter(v => v.length > 0);
      
      // Only process lines that might be data rows
      if (values.length >= 3) {
        const record = {};
        
        // Map values to headers
        for (let j = 0; j < Math.min(headers.length, values.length); j++) {
          record[headers[j]] = values[j];
        }
        
        // Only add if we have enough data
        if (Object.keys(record).length >= 3) {
          records.push(record);
        }
      }
    }
    
    console.log(`Extracted ${records.length} records from PDF content`);
    return records;
  } catch (error) {
    console.error('Error extracting tabular data from PDF:', error);
    return [];
  }
}

/**
 * Detect the format of a file based on its extension
 * 
 * @param {string} filePath - Path to the file
 * @returns {string} - File format: 'csv', 'excel', 'pdf', or 'unknown'
 */
export function detectFileFormat(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.csv':
      return 'csv';
    case '.xls':
    case '.xlsx':
      return 'excel';
    case '.pdf':
      return 'pdf';
    default:
      return 'unknown';
  }
}

/**
 * Auto-detect and parse a report file
 * 
 * @param {string} filePath - Path to the report file
 * @returns {Promise<Array>} - Array of objects representing the report data
 */
export async function autoDetectAndParseReport(filePath) {
  const format = detectFileFormat(filePath);
  
  switch (format) {
    case 'csv':
      return parseCSV(filePath);
    case 'excel':
      return parseExcel(filePath);
    case 'pdf':
      return await parsePDF(filePath);
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

export default {
  parseCSV,
  parseExcel,
  parsePDF,
  detectFileFormat,
  autoDetectAndParseReport
};