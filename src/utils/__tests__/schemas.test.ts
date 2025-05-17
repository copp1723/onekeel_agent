/**
 * Tests for the schema validation functionality
 */

import { validateSchema, SalesSchema, InventorySchema, LeadsSchema } from '../schemas';
import { z } from 'zod';

describe('Schema Validation', () => {
  describe('Sales Schema', () => {
    test('should validate valid sales data', () => {
      const validData = [
        {
          date: '2023-01-01',
          gross: 1000,
          vin: 'ABC123',
          lead_source: 'Website',
          salesperson: 'John Doe',
          sale_price: 25000
        }
      ];
      
      const result = validateSchema(validData, 'sales');
      expect(result.valid).toBe(true);
      expect(result.missingRequired).toEqual([]);
    });
    
    test('should identify missing required columns', () => {
      const invalidData = [
        {
          date: '2023-01-01',
          // Missing gross, vin, lead_source, salesperson
          sale_price: 25000
        }
      ];
      
      const result = validateSchema(invalidData, 'sales');
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('gross');
      expect(result.missingRequired).toContain('vin');
      expect(result.missingRequired).toContain('lead_source');
      expect(result.missingRequired).toContain('salesperson');
    });
    
    test('should handle type conversions', () => {
      const data = [
        {
          date: '2023-01-01',
          gross: '$1,000.50',
          vin: 'ABC123',
          lead_source: 'Website',
          salesperson: 'John Doe',
          sale_price: '$25,000'
        }
      ];
      
      // Parse with the schema directly to test conversions
      const parsed = z.array(SalesSchema).parse(data);
      
      expect(parsed[0].date instanceof Date).toBe(true);
      expect(typeof parsed[0].gross).toBe('number');
      expect(parsed[0].gross).toBe(1000.5);
      expect(typeof parsed[0].sale_price).toBe('number');
      expect(parsed[0].sale_price).toBe(25000);
    });
  });
  
  describe('Inventory Schema', () => {
    test('should validate valid inventory data', () => {
      const validData = [
        {
          vin: 'ABC123',
          days_in_stock: 30,
          list_price: 25000,
          vehicle_year: 2023,
          vehicle_make: 'Honda',
          vehicle_model: 'Accord'
        }
      ];
      
      const result = validateSchema(validData, 'inventory');
      expect(result.valid).toBe(true);
      expect(result.missingRequired).toEqual([]);
    });
    
    test('should identify missing required columns', () => {
      const invalidData = [
        {
          // Missing vin
          days_in_stock: 30,
          list_price: 25000
        }
      ];
      
      const result = validateSchema(invalidData, 'inventory');
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('vin');
    });
    
    test('should handle type conversions', () => {
      const data = [
        {
          vin: 'ABC123',
          days_in_stock: '30',
          list_price: '$25,000',
          vehicle_year: '2023',
          certified: 'Yes'
        }
      ];
      
      // Parse with the schema directly to test conversions
      const parsed = z.array(InventorySchema).parse(data);
      
      expect(typeof parsed[0].days_in_stock).toBe('number');
      expect(parsed[0].days_in_stock).toBe(30);
      expect(typeof parsed[0].list_price).toBe('number');
      expect(parsed[0].list_price).toBe(25000);
      expect(typeof parsed[0].vehicle_year).toBe('number');
      expect(parsed[0].vehicle_year).toBe(2023);
      expect(typeof parsed[0].certified).toBe('boolean');
      expect(parsed[0].certified).toBe(true);
    });
  });
  
  describe('Leads Schema', () => {
    test('should validate valid leads data', () => {
      const validData = [
        {
          date: '2023-01-01',
          lead_source: 'Website',
          status: 'New',
          email: 'test@example.com',
          phone: '123-456-7890'
        }
      ];
      
      const result = validateSchema(validData, 'leads');
      expect(result.valid).toBe(true);
      expect(result.missingRequired).toEqual([]);
    });
    
    test('should identify missing required columns', () => {
      const invalidData = [
        {
          // Missing date
          lead_source: 'Website',
          status: 'New'
        }
      ];
      
      const result = validateSchema(invalidData, 'leads');
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('date');
    });
    
    test('should validate email format', () => {
      const invalidData = [
        {
          date: '2023-01-01',
          lead_source: 'Website',
          status: 'New',
          email: 'invalid-email', // Invalid email format
          phone: '123-456-7890'
        }
      ];
      
      // This should throw a ZodError
      expect(() => {
        z.array(LeadsSchema).parse(invalidData);
      }).toThrow();
    });
  });
  
  describe('Edge cases', () => {
    test('should handle empty data', () => {
      const emptyData: Record<string, any>[] = [];
      const result = validateSchema(emptyData, 'sales');
      
      expect(result.valid).toBe(true);
      expect(result.missingRequired).toEqual([]);
    });
    
    test('should handle unknown report type', () => {
      const data = [{ test: 'value' }];
      
      // @ts-ignore - Testing invalid report type
      const result = validateSchema(data, 'unknown');
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('No schema defined for report type');
    });
  });
});
