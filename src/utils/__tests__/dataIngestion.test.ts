/**
 * Tests for the data ingestion pipeline
 */

import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';
import { normalizeAndValidate } from '../dataIngestion';

// Helper function to load test data from CSV files
function loadTestData(filePath: string): Record<string, any>[] {
  const content = fs.readFileSync(filePath, 'utf8');
  return csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

describe('Data Ingestion Pipeline', () => {
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
    
    test('should process inventory data successfully', async () => {
      // Skip test if data is not available
      if (inventoryData.length === 0) {
        console.warn('Skipping test due to missing test data');
        return;
      }
      
      const result = await normalizeAndValidate(inventoryData, 'vinsolutions', 'inventory');
      
      // Check that the pipeline was successful
      expect(result.success).toBe(true);
      
      // Check that all steps were completed
      expect(result.steps.length).toBe(3);
      expect(result.steps[0].step).toBe('map_columns');
      expect(result.steps[0].success).toBe(true);
      expect(result.steps[1].step).toBe('clean_data');
      expect(result.steps[1].success).toBe(true);
      expect(result.steps[2].step).toBe('validate_schema');
      expect(result.steps[2].success).toBe(true);
      
      // Check that data was processed
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(inventoryData.length);
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
    
    test('should process sales data successfully', async () => {
      // Skip test if data is not available
      if (salesData.length === 0) {
        console.warn('Skipping test due to missing test data');
        return;
      }
      
      const result = await normalizeAndValidate(salesData, 'dealersocket', 'sales');
      
      // Check that the pipeline was successful
      expect(result.success).toBe(true);
      
      // Check that all steps were completed
      expect(result.steps.length).toBe(3);
      expect(result.steps[0].step).toBe('map_columns');
      expect(result.steps[0].success).toBe(true);
      expect(result.steps[1].step).toBe('clean_data');
      expect(result.steps[1].success).toBe(true);
      expect(result.steps[2].step).toBe('validate_schema');
      expect(result.steps[2].success).toBe(true);
      
      // Check that data was processed
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(salesData.length);
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
    
    test('should process leads data successfully', async () => {
      // Skip test if data is not available
      if (leadsData.length === 0) {
        console.warn('Skipping test due to missing test data');
        return;
      }
      
      const result = await normalizeAndValidate(leadsData, 'dealersocket', 'leads');
      
      // Check that the pipeline was successful
      expect(result.success).toBe(true);
      
      // Check that all steps were completed
      expect(result.steps.length).toBe(3);
      expect(result.steps[0].step).toBe('map_columns');
      expect(result.steps[0].success).toBe(true);
      expect(result.steps[1].step).toBe('clean_data');
      expect(result.steps[1].success).toBe(true);
      expect(result.steps[2].step).toBe('validate_schema');
      expect(result.steps[2].success).toBe(true);
      
      // Check that data was processed
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(leadsData.length);
    });
  });
  
  // Test with invalid data
  describe('Error handling', () => {
    test('should handle unknown report type', async () => {
      const data = [{ test: 'value' }];
      
      try {
        // @ts-ignore - Testing invalid report type
        await normalizeAndValidate(data, 'vinsolutions', 'unknown');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('Unknown report type');
      }
    });
    
    test('should handle missing required columns', async () => {
      const invalidData = [
        {
          // Missing required columns for sales
          customer_name: 'John Doe',
          vehicle: 'Honda Accord'
        }
      ];
      
      const result = await normalizeAndValidate(invalidData, 'vinsolutions', 'sales');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Missing required columns');
      
      // Check that the pipeline stopped at validation
      expect(result.steps.length).toBe(3);
      expect(result.steps[0].step).toBe('map_columns');
      expect(result.steps[0].success).toBe(true);
      expect(result.steps[1].step).toBe('clean_data');
      expect(result.steps[1].success).toBe(true);
      expect(result.steps[2].step).toBe('validate_schema');
      expect(result.steps[2].success).toBe(false);
    });
  });
});
