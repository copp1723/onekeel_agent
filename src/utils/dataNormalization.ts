/**
 * Data Normalization Module
 * 
 * Provides functions for cleaning and normalizing data.
 * Extracted and ported from the Python ingestion_pipeline.py module.
 */

import { ReportType } from './columnMapping';

/**
 * Result of the data cleaning operation
 */
export interface CleaningResult {
  actions: Array<{
    action: string;
    column: string;
    method?: string;
    count?: number;
    from?: string;
    to?: string;
  }>;
  rowCount: {
    before: number;
    after: number;
  };
}

/**
 * Cleans and normalizes data
 * 
 * @param data - Data to clean
 * @param reportType - Type of report
 * @returns Tuple of [cleaned data, cleaning results]
 */
export function cleanData(
  data: Record<string, any>[],
  reportType: ReportType
): [Record<string, any>[], CleaningResult] {
  // Make a copy to avoid modifying the original
  const cleanedData = JSON.parse(JSON.stringify(data));
  
  // Tracking results
  const result: CleaningResult = {
    actions: [],
    rowCount: {
      before: data.length,
      after: data.length
    }
  };
  
  if (cleanedData.length === 0) {
    return [cleanedData, result];
  }
  
  // Get all column names
  const columns = Object.keys(cleanedData[0]);
  
  // 1. Convert data types based on column names
  for (const col of columns) {
    // Try to infer type from column name
    let inferredType: string | null = null;
    
    // Check for date columns
    if (/date|time|created/i.test(col)) {
      inferredType = "date";
    }
    // Check for monetary columns
    else if (/price|cost|gross|msrp|amount/i.test(col)) {
      inferredType = "price";
    }
    // Check for numeric columns
    else if (/days|count|number|id|year|mileage/i.test(col)) {
      inferredType = "number";
    }
    
    // Apply type conversion if inferred
    if (inferredType) {
      const originalType = typeof cleanedData[0][col];
      
      try {
        if (inferredType === "date") {
          cleanedData.forEach(record => {
            if (record[col] && !(record[col] instanceof Date)) {
              record[col] = new Date(record[col]);
            }
          });
        } else if (inferredType === "price") {
          cleanedData.forEach(record => {
            if (record[col] && typeof record[col] === 'string') {
              record[col] = parseFloat(record[col].replace(/[$,]/g, ''));
            }
          });
        } else if (inferredType === "number") {
          cleanedData.forEach(record => {
            if (record[col] && typeof record[col] === 'string') {
              record[col] = parseInt(record[col].replace(/,/g, ''), 10);
            }
          });
        }
        
        result.actions.push({
          action: "convert_type",
          column: col,
          from: originalType,
          to: inferredType
        });
      } catch (error) {
        // If conversion fails, leave as is
        console.warn(`Failed to convert column ${col} to ${inferredType}: ${error}`);
      }
    }
  }
  
  // 2. Handle missing values
  for (const col of columns) {
    const missingCount = cleanedData.filter(record => 
      record[col] === null || record[col] === undefined || record[col] === ''
    ).length;
    
    if (missingCount > 0) {
      // Different handling based on column type
      if (/date|time/i.test(col)) {
        // For date columns, use the earliest date in the column
        const validDates = cleanedData
          .filter(record => record[col] instanceof Date && !isNaN(record[col].getTime()))
          .map(record => record[col]);
        
        if (validDates.length > 0) {
          const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
          
          cleanedData.forEach(record => {
            if (!record[col] || !(record[col] instanceof Date) || isNaN(record[col].getTime())) {
              record[col] = minDate;
            }
          });
          
          result.actions.push({
            action: "fill_missing",
            column: col,
            count: missingCount,
            method: "min_date"
          });
        }
      } else if (/price|cost|gross|msrp|amount|days|count|number|id|year|mileage/i.test(col)) {
        // For numeric columns, use zero
        cleanedData.forEach(record => {
          if (record[col] === null || record[col] === undefined || record[col] === '') {
            record[col] = 0;
          }
        });
        
        result.actions.push({
          action: "fill_missing",
          column: col,
          count: missingCount,
          method: "zero"
        });
      } else {
        // For string columns, use empty string
        cleanedData.forEach(record => {
          if (record[col] === null || record[col] === undefined) {
            record[col] = "";
          }
        });
        
        result.actions.push({
          action: "fill_missing",
          column: col,
          count: missingCount,
          method: "empty_string"
        });
      }
    }
  }
  
  // 3. Normalize text fields
  for (const col of columns) {
    if (typeof cleanedData[0][col] === 'string') {
      // Normalize strings: strip whitespace, handle case
      if (/source|name|model|make|salesperson/i.test(col)) {
        // Convert to string, strip whitespace
        cleanedData.forEach(record => {
          if (typeof record[col] === 'string') {
            record[col] = record[col].trim();
          }
        });
        
        if (/lead_source/i.test(col)) {
          // For lead sources, convert to title case
          cleanedData.forEach(record => {
            if (typeof record[col] === 'string') {
              record[col] = record[col]
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            }
          });
          
          result.actions.push({
            action: "normalize_text",
            column: col,
            method: "title_case"
          });
        } else {
          // For other text fields, basic normalization
          result.actions.push({
            action: "normalize_text",
            column: col,
            method: "strip_whitespace"
          });
        }
      }
    }
  }
  
  // 4. Special handling for specific column types
  
  // VIN normalization
  if (columns.includes('vin')) {
    cleanedData.forEach(record => {
      if (typeof record.vin === 'string') {
        record.vin = record.vin.toUpperCase().replace(/\s/g, '');
      }
    });
    
    result.actions.push({
      action: "normalize_vin",
      column: "vin"
    });
  }
  
  // Date range validation
  const dateColumns = columns.filter(col => /date|time/i.test(col));
  
  for (const col of dateColumns) {
    const now = new Date();
    let futureCount = 0;
    let oldCount = 0;
    
    // Check for future dates
    cleanedData.forEach(record => {
      if (record[col] instanceof Date && !isNaN(record[col].getTime())) {
        if (record[col] > now) {
          record[col] = now;
          futureCount++;
        }
      }
    });
    
    if (futureCount > 0) {
      result.actions.push({
        action: "fix_future_dates",
        column: col,
        count: futureCount
      });
    }
    
    // Check for very old dates (likely errors)
    const oldThreshold = new Date('2000-01-01');
    
    cleanedData.forEach(record => {
      if (record[col] instanceof Date && !isNaN(record[col].getTime())) {
        if (record[col] < oldThreshold) {
          // Find a reasonable date to use instead
          const validDates = cleanedData
            .filter(r => 
              r[col] instanceof Date && 
              !isNaN(r[col].getTime()) && 
              r[col] >= oldThreshold
            )
            .map(r => r[col]);
          
          if (validDates.length > 0) {
            // Use the median date
            const sortedDates = validDates.sort((a, b) => a.getTime() - b.getTime());
            const medianDate = sortedDates[Math.floor(sortedDates.length / 2)];
            record[col] = medianDate;
            oldCount++;
          }
        }
      }
    });
    
    if (oldCount > 0) {
      result.actions.push({
        action: "fix_old_dates",
        column: col,
        count: oldCount
      });
    }
  }
  
  return [cleanedData, result];
}

export default {
  cleanData
};
