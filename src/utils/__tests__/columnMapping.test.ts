/**
 * Tests for the column mapping functionality
 */

import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';
import { mapColumns, ReportType, VendorId } from '../columnMapping';

// Helper function to load test data from CSV files
function loadTestData(filePath: string): Record<string, any>[] {
  const content = fs.readFileSync(filePath, 'utf8');
  return csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

describe('Column Mapping', () => {
  // Test with real inventory data
  describe('Inventory data', () => {
    const inventoryFilePath = path.join(process.cwd(), 'real data files', '_Inventory   - Sheet1.csv');
    let inventoryData: Record<string, any>[];
    
    beforeAll(() => {
      // Check if the file exists
      if (fs.existsSync(inventoryFilePath)) {
        inventoryData = loadTestData(inventoryFilePath);
      } else {
        console.warn(`Test file not found: ${inventoryFilePath}`);
        inventoryData = [];
      }
    });
    
    test('should map inventory columns correctly', () => {
      // Skip test if data is not available
      if (inventoryData.length === 0) {
        console.warn('Skipping test due to missing test data');
        return;
      }
      
      const [mappedData, result] = mapColumns(inventoryData, 'vinsolutions', 'inventory');
      
      // Check that the mapping was successful
      expect(result.mapped).toBeDefined();
      
      // Check specific mappings
      expect(result.mapped).toHaveProperty('vin');
      expect(result.mapped).toHaveProperty('vehicle_year');
      expect(result.mapped).toHaveProperty('vehicle_make');
      expect(result.mapped).toHaveProperty('vehicle_model');
      
      // Check that the data was mapped correctly
      expect(mappedData.length).toBe(inventoryData.length);
      expect(mappedData[0]).toHaveProperty('vin');
    });
  });
  
  // Test with real sales data
  describe('Sales data', () => {
    const salesFilePath = path.join(process.cwd(), 'real data files', 'watchdog data easy.csv');
    let salesData: Record<string, any>[];
    
    beforeAll(() => {
      // Check if the file exists
      if (fs.existsSync(salesFilePath)) {
        salesData = loadTestData(salesFilePath);
      } else {
        console.warn(`Test file not found: ${salesFilePath}`);
        salesData = [];
      }
    });
    
    test('should map sales columns correctly', () => {
      // Skip test if data is not available
      if (salesData.length === 0) {
        console.warn('Skipping test due to missing test data');
        return;
      }
      
      const [mappedData, result] = mapColumns(salesData, 'dealersocket', 'sales');
      
      // Check that the mapping was successful
      expect(result.mapped).toBeDefined();
      
      // Check specific mappings
      expect(result.mapped).toHaveProperty('lead_source');
      expect(result.mapped).toHaveProperty('salesperson');
      expect(result.mapped).toHaveProperty('vehicle_year');
      expect(result.mapped).toHaveProperty('vehicle_make');
      expect(result.mapped).toHaveProperty('vehicle_model');
      
      // Check that the data was mapped correctly
      expect(mappedData.length).toBe(salesData.length);
      expect(mappedData[0]).toHaveProperty('lead_source');
    });
  });
  
  // Test with real leads data
  describe('Leads data', () => {
    const leadsFilePath = path.join(process.cwd(), 'real data files', 'watchdog data hard.csv');
    let leadsData: Record<string, any>[];
    
    beforeAll(() => {
      // Check if the file exists
      if (fs.existsSync(leadsFilePath)) {
        leadsData = loadTestData(leadsFilePath);
      } else {
        console.warn(`Test file not found: ${leadsFilePath}`);
        leadsData = [];
      }
    });
    
    test('should map leads columns correctly', () => {
      // Skip test if data is not available
      if (leadsData.length === 0) {
        console.warn('Skipping test due to missing test data');
        return;
      }
      
      const [mappedData, result] = mapColumns(leadsData, 'dealersocket', 'leads');
      
      // Check that the mapping was successful
      expect(result.mapped).toBeDefined();
      
      // Check specific mappings
      expect(result.mapped).toHaveProperty('lead_source');
      expect(result.mapped).toHaveProperty('email');
      expect(result.mapped).toHaveProperty('phone');
      expect(result.mapped).toHaveProperty('vehicle_year');
      expect(result.mapped).toHaveProperty('vehicle_make');
      expect(result.mapped).toHaveProperty('vehicle_model');
      
      // Check that the data was mapped correctly
      expect(mappedData.length).toBe(leadsData.length);
      expect(mappedData[0]).toHaveProperty('lead_source');
    });
  });
  
  // Test with edge cases
  describe('Edge cases', () => {
    test('should handle empty data', () => {
      const emptyData: Record<string, any>[] = [];
      const [mappedData, result] = mapColumns(emptyData, 'vinsolutions', 'sales');
      
      expect(mappedData).toEqual([]);
      expect(result.originalColumns).toEqual([]);
      expect(result.mapped).toEqual({});
      expect(result.unmapped).toEqual([]);
    });
    
    test('should throw error for unknown report type', () => {
      const data = [{ test: 'value' }];
      
      expect(() => {
        // @ts-ignore - Testing invalid report type
        mapColumns(data, 'vinsolutions', 'unknown');
      }).toThrow('Unknown report type');
    });
  });
});
