/**
 * Column Mapping Module
 * 
 * Provides functionality for mapping columns from vendor-specific names to standardized names.
 * Extracted and ported from the Python ingestion_pipeline.py module.
 */

import { z } from 'zod';

/**
 * Report types supported by the column mapping
 */
export type ReportType = 'sales' | 'inventory' | 'leads';

/**
 * Vendor IDs supported by the column mapping
 */
export type VendorId = 'dealersocket' | 'vinsolutions' | 'eleads' | string;

/**
 * Column mapping result interface
 */
export interface ColumnMappingResult {
  originalColumns: string[];
  mapped: Record<string, string>;
  unmapped: string[];
  vendorSpecific: Record<string, string>;
}

/**
 * Column mapping definition for a specific report type
 */
export interface ColumnMappingDefinition {
  [targetColumn: string]: string[] | Record<string, string[]>;
}

/**
 * Column mappings for different report types
 */
export const COLUMN_MAPPINGS: Record<ReportType, ColumnMappingDefinition> = {
  "sales": {
    // Common mappings across vendors
    "date": ["sale_date", "saledate", "date", "deal_date", "transaction_date"],
    "customer_name": ["customer", "customer_name", "buyer", "client"],
    "gross": ["gross_profit", "gross", "total_gross", "front_gross"],
    "vehicle": ["vehicle", "vehicle_desc", "car_description"],
    "vin": ["vin", "vin_number", "vehicle_id"],
    "salesperson": ["salesperson", "sales_person", "sales_rep", "associate"],
    "lead_source": ["lead_source", "leadsource", "source", "lead_type", "origin"],
    "sale_price": ["sale_price", "selling_price", "amount", "price"],
    "stock_num": ["stock", "stock_number", "stocknumber"],
    "vehicle_year": ["year", "vehicle_year", "modelyear"],
    "vehicle_make": ["make", "vehicle_make"],
    "vehicle_model": ["model", "vehicle_model"],
    
    // Vendor-specific mappings
    "dealersocket": {
      "date": ["deal_date_alternate_format", "sale_timestamp"],
      "gross": ["front_gross_alt", "total_before_pack"],
      "lead_source": ["lead_category", "customer_source"]
    },
    "vinsolutions": {
      "date": ["closing_date", "deal_created"],
      "gross": ["final_gross", "dealership_gross"],
      "lead_source": ["lead_gen_source", "customer_acquisition_source"]
    },
    "eleads": {
      "date": ["dt_sale", "sale_time"],
      "gross": ["profit", "gross_margin"],
      "lead_source": ["lead_origin", "traffic_source"]
    }
  },
  "inventory": {
    // Common mappings
    "stock_num": ["stock", "stock_number", "stocknumber", "stock_#", "inventory_id"],
    "vin": ["vin", "vin_number", "vehicle_id"],
    "days_in_stock": ["days_in_stock", "age", "days_on_lot", "inventory_age"],
    "vehicle_year": ["year", "vehicle_year", "modelyear"],
    "vehicle_make": ["make", "vehicle_make"],
    "vehicle_model": ["model", "vehicle_model"],
    "mileage": ["odometer", "mileage", "miles"],
    "list_price": ["list_price", "price", "asking_price", "msrp"],
    "cost": ["cost", "acquisition_cost", "dealer_cost"],
    "certified": ["certified", "is_certified", "certified_flag"],
    "ext_color": ["exterior_color", "ext_color", "color", "vehicle_color"],
    "int_color": ["interior_color", "int_color", "trim_color"],
    "stock_date": ["stock_date", "date_added", "in_stock_date"],
    
    // Vendor-specific mappings
    "dealersocket": {
      "days_in_stock": ["age_in_days", "inventory_days"],
      "certified": ["certified_pre_owned", "cpo_flag"]
    },
    "vinsolutions": {
      "days_in_stock": ["days_in_inventory", "lot_age"],
      "certified": ["is_cpo", "cpo_status"]
    },
    "eleads": {
      "days_in_stock": ["days_aged", "age_days"],
      "certified": ["cert_flag", "cpo"]
    }
  },
  "leads": {
    // Common mappings
    "date": ["lead_date", "created_date", "submission_date", "date_received"],
    "customer_name": ["customer", "customer_name", "prospect", "lead_name"],
    "email": ["email", "email_address", "customer_email"],
    "phone": ["phone", "phone_number", "contact_phone", "customer_phone"],
    "lead_source": ["lead_source", "leadsource", "source", "lead_type", "origin"],
    "vehicle_interest": ["vehicle_interest", "interested_in", "vehicle_of_interest"],
    "status": ["status", "lead_status", "state", "disposition"],
    "salesperson": ["salesperson", "sales_person", "sales_rep", "owner"],
    "vehicle_year": ["year", "vehicle_year", "modelyear"],
    "vehicle_make": ["make", "vehicle_make"],
    "vehicle_model": ["model", "vehicle_model"],
    
    // Vendor-specific mappings
    "dealersocket": {
      "lead_source": ["lead_provider", "traffic_source"],
      "status": ["lead_outcome", "disposition"]
    },
    "vinsolutions": {
      "lead_source": ["source_name", "origin_source"],
      "status": ["current_status", "lead_disposition"]
    },
    "eleads": {
      "lead_source": ["lead_campaign", "source_type"],
      "status": ["status_code", "current_state"]
    }
  }
};

/**
 * Maps columns from vendor-specific names to standard names
 * 
 * @param data - Input data as an array of records
 * @param vendorId - ID of the vendor (e.g., 'dealersocket')
 * @param reportType - Type of report (e.g., 'sales', 'inventory', 'leads')
 * @returns Tuple of [mapped data, mapping results]
 */
export function mapColumns(
  data: Record<string, any>[],
  vendorId: VendorId,
  reportType: ReportType
): [Record<string, any>[], ColumnMappingResult] {
  // Tracking results
  const result: ColumnMappingResult = {
    originalColumns: data.length > 0 ? Object.keys(data[0]) : [],
    mapped: {},
    unmapped: [],
    vendorSpecific: {}
  };
  
  // Get mappings for this report type
  if (!(reportType in COLUMN_MAPPINGS)) {
    throw new Error(`Unknown report type: ${reportType}`);
  }
  
  const mappings = COLUMN_MAPPINGS[reportType];
  
  // Create a new array to build with mapped columns
  const mappedData: Record<string, any>[] = data.map(() => ({}));
  
  // First pass: try to map using standard column mappings
  for (const [targetCol, sourceOptions] of Object.entries(mappings)) {
    // Skip vendor-specific mappings (they're objects, not arrays)
    if (!Array.isArray(sourceOptions)) {
      continue;
    }
    
    // Try each possible source column
    let mapped = false;
    for (const sourceCol of sourceOptions) {
      // Try case insensitive matching
      const matchingCols = result.originalColumns.filter(
        col => col.toLowerCase() === sourceCol.toLowerCase()
      );
      
      if (matchingCols.length > 0) {
        // Use the first match
        const match = matchingCols[0];
        // Copy the data for this column to all records
        data.forEach((record, index) => {
          mappedData[index][targetCol] = record[match];
        });
        
        result.mapped[targetCol] = match;
        mapped = true;
        break;
      }
    }
  }
  
  // Second pass: try vendor-specific mappings if available
  const vendorMappings = mappings[vendorId] as Record<string, string[]> | undefined;
  
  if (vendorMappings) {
    for (const [targetCol, sourceOptions] of Object.entries(vendorMappings)) {
      // Skip if already mapped
      if (targetCol in result.mapped) {
        continue;
      }
      
      // Try each possible source column
      let mapped = false;
      for (const sourceCol of sourceOptions) {
        // Try case insensitive matching
        const matchingCols = result.originalColumns.filter(
          col => col.toLowerCase() === sourceCol.toLowerCase()
        );
        
        if (matchingCols.length > 0) {
          // Use the first match
          const match = matchingCols[0];
          // Copy the data for this column to all records
          data.forEach((record, index) => {
            mappedData[index][targetCol] = record[match];
          });
          
          result.mapped[targetCol] = match;
          result.vendorSpecific[targetCol] = match;
          mapped = true;
          break;
        }
      }
      
      if (!mapped) {
        // Second attempt: try partial matching
        for (const sourceCol of sourceOptions) {
          const matchingCols = result.originalColumns.filter(
            col => sourceCol.toLowerCase().includes(col.toLowerCase()) || 
                  col.toLowerCase().includes(sourceCol.toLowerCase())
          );
          
          if (matchingCols.length > 0) {
            // Use the first match
            const match = matchingCols[0];
            // Copy the data for this column to all records
            data.forEach((record, index) => {
              mappedData[index][targetCol] = record[match];
            });
            
            result.mapped[targetCol] = match;
            result.vendorSpecific[targetCol] = match;
            mapped = true;
            break;
          }
        }
      }
    }
  }
  
  // Track unmapped original columns
  const mappedSources = new Set(Object.values(result.mapped));
  result.unmapped = result.originalColumns.filter(col => !mappedSources.has(col));
  
  // Copy any unmapped columns with their original names
  for (const col of result.unmapped) {
    data.forEach((record, index) => {
      mappedData[index][col] = record[col];
    });
  }
  
  return [mappedData, result];
}

export default {
  COLUMN_MAPPINGS,
  mapColumns
};
