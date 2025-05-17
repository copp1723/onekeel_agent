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
import os from 'os';
import { logMetric } from '../performanceMetrics.js';

// Simple in-memory cache for parsed files
const parseCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function logResourceUsage(context = '') {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  console.log(`[${context}] Memory: RSS ${(mem.rss/1024/1024).toFixed(2)}MB, Heap ${(mem.heapUsed/1024/1024).toFixed(2)}MB, CPU: user ${(cpu.user/1000).toFixed(1)}ms, system ${(cpu.system/1000).toFixed(1)}ms`);
}

function cacheSet(key, value) {
  parseCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}
function cacheGet(key) {
  const entry = parseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    parseCache.delete(key);
    return null;
  }
  return entry.value;
}
function cacheInvalidate(key) {
  parseCache.delete(key);
}

/**
 * Parse CSV report file (streaming, memory-logged, cached)
 * @param {string} filePath
 * @returns {Promise<Array>}
 */
export async function parseCSV(filePath) {
  const cacheKey = `csv:${filePath}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  logResourceUsage('parseCSV:before');
  const start = Date.now();
  const stats = fs.statSync(filePath);
  if (stats.size > 50 * 1024 * 1024) throw new Error('CSV file too large (>50MB)');
  const records = [];
  let rowCount = 0;
  // Streaming parse
  await new Promise((resolve, reject) => {
    const parser = fs.createReadStream(filePath)
      .pipe(csvParse({ columns: true, skip_empty_lines: true, trim: true }));
    parser.on('data', row => {
      rowCount++;
      if (rowCount > 100000) {
        parser.destroy();
        reject(new Error('CSV row limit exceeded (100k)'));
      } else {
        records.push(row);
      }
    });
    parser.on('end', resolve);
    parser.on('error', reject);
  });
  logResourceUsage('parseCSV:after');
  const duration = Date.now() - start;
  console.log(`Parsed ${records.length} records from CSV in ${duration}ms`);
  logMetric('parseCSV', duration, { file: filePath, rows: records.length });
  cacheSet(cacheKey, records);
  return records;
}

/**
 * Parse Excel/XLSX report file (streaming, memory-logged, cached)
 * @param {string} filePath
 * @param {Array} sheetNames
 * @returns {Promise<Array>}
 */
export async function parseExcel(filePath, sheetNames = null) {
  const cacheKey = `excel:${filePath}:${sheetNames ? sheetNames.join(',') : 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  logResourceUsage('parseExcel:before');
  const start = Date.now();
  const stats = fs.statSync(filePath);
  if (stats.size > 100 * 1024 * 1024) throw new Error('Excel file too large (>100MB)');
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath);
  const result = [];
  let rowCount = 0;
  for await (const worksheet of workbook) {
    if (sheetNames && !sheetNames.includes(worksheet.name)) continue;
    let headers = [];
    for await (const row of worksheet) {
      if (rowCount > 100000) throw new Error('Excel row limit exceeded (100k)');
      if (row.number === 1) {
        headers = row.values.slice(1).map(h => h ? h.toString().trim() : '');
        continue;
      }
      const record = {};
      row.values.slice(1).forEach((v, i) => { record[headers[i]] = v; });
      if (Object.keys(record).length > 0) result.push(record);
      rowCount++;
    }
  }
  logResourceUsage('parseExcel:after');
  const duration = Date.now() - start;
  console.log(`Parsed ${result.length} records from Excel in ${duration}ms`);
  logMetric('parseExcel', duration, { file: filePath, rows: result.length, sheets: sheetNames });
  cacheSet(cacheKey, result);
  return result;
}

/**
 * Parse PDF report file (memory-logged, cached)
 * @param {string} filePath
 * @returns {Promise<Array>}
 */
export async function parsePDF(filePath) {
  const cacheKey = `pdf:${filePath}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  logResourceUsage('parsePDF:before');
  const start = Date.now();
  const stats = fs.statSync(filePath);
  if (stats.size > 30 * 1024 * 1024) throw new Error('PDF file too large (>30MB)');
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const text = pdfData.text;
  const { records, confidence } = extractTabularDataFromPDFWithConfidence(text);
  if (confidence < 0.8) throw new Error(`PDF parse confidence too low (${(confidence * 100).toFixed(1)}%)`);
  logResourceUsage('parsePDF:after');
  const duration = Date.now() - start;
  console.log(`Parsed ${records.length} records from PDF in ${duration}ms`);
  logMetric('parsePDF', duration, { file: filePath, rows: records.length, confidence });
  cacheSet(cacheKey, { records, confidence });
  return { records, confidence };
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

// Enhanced: Extract tabular data and compute confidence
function extractTabularDataFromPDFWithConfidence(text) {
  try {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let headerLine = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const words = lines[i].split(/\s+/);
      if (words.length >= 3 && words.filter(w => /^[A-Z]/.test(w)).length >= 3) {
        headerLine = i;
        break;
      }
    }
    if (headerLine === -1) headerLine = 0;
    const headers = lines[headerLine].split(/\s{2,}/).map(h => h.trim()).filter(h => h.length > 0);
    const records = [];
    let validRows = 0;
    for (let i = headerLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 10) continue;
      const values = line.split(/\s{2,}/).map(v => v.trim()).filter(v => v.length > 0);
      if (values.length >= 3) {
        const record = {};
        for (let j = 0; j < Math.min(headers.length, values.length); j++) {
          record[headers[j]] = values[j];
        }
        if (Object.keys(record).length >= 3) {
          records.push(record);
          validRows++;
        }
      }
    }
    // Confidence: ratio of valid data rows to total lines after header
    const totalRows = Math.max(1, lines.length - (headerLine + 1));
    const confidence = Math.min(1, validRows / totalRows);
    console.log(`PDF parse confidence: ${(confidence * 100).toFixed(1)}%`);
    return { records, confidence };
  } catch (error) {
    console.error('Error extracting tabular data from PDF:', error);
    return { records: [], confidence: 0 };
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

/**
 * Caching approach: In-memory cache (Map) keyed by file path and params, with TTL. Cache is invalidated on TTL expiry or explicit call. Not persistent across process restarts. For production, consider Redis or similar for distributed cache.
 */

export default {
  parseCSV,
  parseExcel,
  parsePDF,
  detectFileFormat,
  autoDetectAndParseReport
};