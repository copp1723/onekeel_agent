/**
 * Data Ingestion Module
 * 
 * Provides a unified interface for normalizing, validating, and processing data.
 * Combines column mapping, schema validation, and data normalization.
 */

import { mapColumns, ReportType, VendorId, ColumnMappingResult } from './columnMapping';
import { validateSchema } from './schemas';
import { cleanData, CleaningResult } from './dataNormalization';

/**
 * Result of the ingestion pipeline
 */
export interface IngestionResult {
  success: boolean;
  steps: Array<{
    step: string;
    success: boolean;
    message: string;
    details?: any;
    time: string;
  }>;
  data?: Record<string, any>[];
  error?: string;
}

/**
 * Run the full normalization and validation pipeline on data
 * 
 * @param data - Input data as an array of records
 * @param vendorId - ID of the vendor (e.g., 'dealersocket')
 * @param reportType - Type of report (e.g., 'sales', 'inventory', 'leads')
 * @returns Ingestion result with processed data and status information
 */
export async function normalizeAndValidate(
  data: Record<string, any>[],
  vendorId: VendorId,
  reportType: ReportType
): Promise<IngestionResult> {
  // Initialize result
  const result: IngestionResult = {
    success: true,
    steps: []
  };
  
  // Step 1: Map columns
  try {
    const [mappedData, mappingResult] = mapColumns(data, vendorId, reportType);
    
    result.steps.push({
      step: "map_columns",
      success: true,
      message: `Mapped ${Object.keys(mappingResult.mapped).length} columns, ${mappingResult.unmapped.length} unmapped`,
      details: mappingResult,
      time: new Date().toISOString()
    });
    
    // Update data for next step
    data = mappedData;
  } catch (error) {
    const errorMsg = `Failed to map columns: ${error instanceof Error ? error.message : String(error)}`;
    
    result.steps.push({
      step: "map_columns",
      success: false,
      message: errorMsg,
      time: new Date().toISOString()
    });
    
    result.success = false;
    result.error = errorMsg;
    return result;
  }
  
  // Step 2: Clean data
  try {
    const [cleanedData, cleaningResult] = cleanData(data, reportType);
    
    result.steps.push({
      step: "clean_data",
      success: true,
      message: `Cleaned data with ${cleaningResult.actions.length} actions`,
      details: cleaningResult,
      time: new Date().toISOString()
    });
    
    // Update data for next step
    data = cleanedData;
  } catch (error) {
    const errorMsg = `Failed to clean data: ${error instanceof Error ? error.message : String(error)}`;
    
    result.steps.push({
      step: "clean_data",
      success: false,
      message: errorMsg,
      time: new Date().toISOString()
    });
    
    result.success = false;
    result.error = errorMsg;
    return result;
  }
  
  // Step 3: Validate schema
  try {
    const validationResult = validateSchema(data, reportType);
    
    if (validationResult.valid) {
      result.steps.push({
        step: "validate_schema",
        success: true,
        message: "Schema validation passed",
        details: validationResult,
        time: new Date().toISOString()
      });
    } else {
      result.steps.push({
        step: "validate_schema",
        success: false,
        message: validationResult.message,
        details: validationResult,
        time: new Date().toISOString()
      });
      
      result.success = false;
      result.error = validationResult.message;
      return result;
    }
  } catch (error) {
    const errorMsg = `Failed to validate schema: ${error instanceof Error ? error.message : String(error)}`;
    
    result.steps.push({
      step: "validate_schema",
      success: false,
      message: errorMsg,
      time: new Date().toISOString()
    });
    
    result.success = false;
    result.error = errorMsg;
    return result;
  }
  
  // All steps completed successfully
  result.data = data;
  return result;
}

export default {
  normalizeAndValidate
};
