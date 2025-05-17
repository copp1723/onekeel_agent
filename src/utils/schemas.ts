/**
 * Data Schemas Module
 * 
 * Provides Zod schemas for validating data from different report types.
 * Extracted and ported from the Python ingestion_pipeline.py module.
 */

import { z } from 'zod';
import { ReportType } from './columnMapping';

/**
 * Type conversion mapping for different field types
 */
export const TYPE_CONVERSIONS = {
  "date": z.string().or(z.date()).transform(val => {
    if (val instanceof Date) return val;
    return new Date(val);
  }),
  "datetime": z.string().or(z.date()).transform(val => {
    if (val instanceof Date) return val;
    return new Date(val);
  }),
  "timestamp": z.string().or(z.date()).transform(val => {
    if (val instanceof Date) return val;
    return new Date(val);
  }),
  "price": z.string().or(z.number()).transform(val => {
    if (typeof val === 'number') return val;
    // Handle currency strings (e.g. "$1,234.56")
    return parseFloat(val.replace(/[$,]/g, ''));
  }),
  "cost": z.string().or(z.number()).transform(val => {
    if (typeof val === 'number') return val;
    return parseFloat(val.replace(/[$,]/g, ''));
  }),
  "gross": z.string().or(z.number()).transform(val => {
    if (typeof val === 'number') return val;
    return parseFloat(val.replace(/[$,]/g, ''));
  }),
  "days": z.string().or(z.number()).transform(val => {
    if (typeof val === 'number') return Math.floor(val);
    return parseInt(val, 10);
  }),
  "mileage": z.string().or(z.number()).transform(val => {
    if (typeof val === 'number') return Math.floor(val);
    return parseInt(val.replace(/,/g, ''), 10);
  }),
  "year": z.string().or(z.number()).transform(val => {
    if (typeof val === 'number') return Math.floor(val);
    return parseInt(val, 10);
  })
};

/**
 * Fields that should be deduplicated for each report type
 */
export const DEDUPE_FIELDS: Record<ReportType, string[]> = {
  "sales": ["vin", "stock_num", "date", "customer_name"],
  "inventory": ["vin", "stock_num"],
  "leads": ["email", "phone", "date", "customer_name"]
};

/**
 * Sales report schema
 */
export const SalesSchema = z.object({
  date: TYPE_CONVERSIONS.date,
  gross: TYPE_CONVERSIONS.gross.optional(),
  vin: z.string().optional(),
  lead_source: z.string().optional(),
  salesperson: z.string().optional(),
  sale_price: TYPE_CONVERSIONS.price.optional(),
  customer_name: z.string().optional(),
  vehicle: z.string().optional(),
  stock_num: z.string().optional(),
  vehicle_year: TYPE_CONVERSIONS.year.optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional()
});

/**
 * Inventory report schema
 */
export const InventorySchema = z.object({
  vin: z.string(),
  days_in_stock: TYPE_CONVERSIONS.days.optional(),
  list_price: TYPE_CONVERSIONS.price.optional(),
  stock_num: z.string().optional(),
  vehicle_year: TYPE_CONVERSIONS.year.optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  mileage: TYPE_CONVERSIONS.mileage.optional(),
  cost: TYPE_CONVERSIONS.cost.optional(),
  certified: z.boolean().or(z.string().transform(val => 
    val.toLowerCase() === 'yes' || val.toLowerCase() === 'true' || val === '1'
  )).optional(),
  ext_color: z.string().optional(),
  int_color: z.string().optional(),
  stock_date: TYPE_CONVERSIONS.date.optional()
});

/**
 * Leads report schema
 */
export const LeadsSchema = z.object({
  date: TYPE_CONVERSIONS.date,
  lead_source: z.string().optional(),
  status: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  customer_name: z.string().optional(),
  vehicle_interest: z.string().optional(),
  salesperson: z.string().optional(),
  vehicle_year: TYPE_CONVERSIONS.year.optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional()
});

/**
 * Schema definitions for different report types
 */
export const SCHEMAS: Record<ReportType, z.ZodObject<any>> = {
  "sales": SalesSchema,
  "inventory": InventorySchema,
  "leads": LeadsSchema
};

/**
 * Required columns for each report type
 */
export const REQUIRED_COLUMNS: Record<ReportType, string[]> = {
  "sales": ["date", "gross", "vin", "lead_source", "salesperson"],
  "inventory": ["vin", "days_in_stock", "list_price"],
  "leads": ["date", "lead_source", "status"]
};

/**
 * Validates data against the schema for a specific report type
 * 
 * @param data - Data to validate
 * @param reportType - Type of report
 * @returns Validation result with errors if any
 */
export function validateSchema(
  data: Record<string, any>[],
  reportType: ReportType
): { valid: boolean; missingRequired: string[]; errors: any[]; message: string } {
  const result = {
    valid: true,
    missingRequired: [] as string[],
    errors: [] as any[],
    message: "Validation passed"
  };
  
  // Check if schema exists for this report type
  if (!(reportType in SCHEMAS)) {
    return {
      valid: false,
      missingRequired: [],
      errors: [],
      message: `No schema defined for report type: ${reportType}`
    };
  }
  
  const schema = SCHEMAS[reportType];
  const requiredColumns = REQUIRED_COLUMNS[reportType];
  
  // Check for required columns
  if (data.length > 0) {
    const columns = Object.keys(data[0]);
    for (const col of requiredColumns) {
      if (!columns.includes(col)) {
        result.missingRequired.push(col);
        result.valid = false;
      }
    }
  }
  
  // If missing required columns, return early
  if (result.missingRequired.length > 0) {
    result.message = `Missing required columns: ${result.missingRequired.join(', ')}`;
    return result;
  }
  
  // Validate data against schema
  try {
    const arraySchema = z.array(schema);
    arraySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.valid = false;
      result.errors = error.errors;
      result.message = `Schema validation failed: ${error.message}`;
    } else {
      result.valid = false;
      result.message = `Validation error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  return result;
}

export default {
  TYPE_CONVERSIONS,
  DEDUPE_FIELDS,
  SCHEMAS,
  REQUIRED_COLUMNS,
  validateSchema
};
