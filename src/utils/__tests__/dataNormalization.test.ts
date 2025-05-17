/**
 * Tests for the data normalization functionality
 */

import { cleanData } from '../dataNormalization';

describe('Data Normalization', () => {
  describe('Type conversion', () => {
    test('should convert date columns', () => {
      const data = [
        {
          sale_date: '2023-01-01',
          created_date: '2023-01-02T12:00:00Z'
        }
      ];
      
      const [cleanedData, result] = cleanData(data, 'sales');
      
      expect(cleanedData[0].sale_date instanceof Date).toBe(true);
      expect(cleanedData[0].created_date instanceof Date).toBe(true);
      
      // Check that actions were recorded
      const dateConversions = result.actions.filter(
        action => action.action === 'convert_type' && action.to === 'date'
      );
      expect(dateConversions.length).toBe(2);
    });
    
    test('should convert price columns', () => {
      const data = [
        {
          sale_price: '$25,000.50',
          list_price: '30000',
          cost: '$20,500'
        }
      ];
      
      const [cleanedData, result] = cleanData(data, 'sales');
      
      expect(typeof cleanedData[0].sale_price).toBe('number');
      expect(cleanedData[0].sale_price).toBe(25000.5);
      expect(typeof cleanedData[0].list_price).toBe('number');
      expect(cleanedData[0].list_price).toBe(30000);
      expect(typeof cleanedData[0].cost).toBe('number');
      expect(cleanedData[0].cost).toBe(20500);
      
      // Check that actions were recorded
      const priceConversions = result.actions.filter(
        action => action.action === 'convert_type' && action.to === 'price'
      );
      expect(priceConversions.length).toBe(3);
    });
    
    test('should convert numeric columns', () => {
      const data = [
        {
          days_in_stock: '30',
          vehicle_year: '2023',
          mileage: '15,000'
        }
      ];
      
      const [cleanedData, result] = cleanData(data, 'inventory');
      
      expect(typeof cleanedData[0].days_in_stock).toBe('number');
      expect(cleanedData[0].days_in_stock).toBe(30);
      expect(typeof cleanedData[0].vehicle_year).toBe('number');
      expect(cleanedData[0].vehicle_year).toBe(2023);
      expect(typeof cleanedData[0].mileage).toBe('number');
      expect(cleanedData[0].mileage).toBe(15000);
      
      // Check that actions were recorded
      const numericConversions = result.actions.filter(
        action => action.action === 'convert_type' && action.to === 'number'
      );
      expect(numericConversions.length).toBe(3);
    });
  });
  
  describe('Missing value handling', () => {
    test('should fill missing date values', () => {
      const data = [
        { sale_date: '2023-01-01' },
        { sale_date: null },
        { sale_date: '' }
      ];
      
      const [cleanedData, result] = cleanData(data, 'sales');
      
      // All records should have a date
      expect(cleanedData[0].sale_date instanceof Date).toBe(true);
      expect(cleanedData[1].sale_date instanceof Date).toBe(true);
      expect(cleanedData[2].sale_date instanceof Date).toBe(true);
      
      // Check that actions were recorded
      const fillActions = result.actions.filter(
        action => action.action === 'fill_missing'
      );
      expect(fillActions.length).toBe(1);
    });
    
    test('should fill missing numeric values with zero', () => {
      const data = [
        { days_in_stock: 30, mileage: 15000 },
        { days_in_stock: null, mileage: '' },
        { days_in_stock: undefined, mileage: null }
      ];
      
      const [cleanedData, result] = cleanData(data, 'inventory');
      
      // All records should have numeric values
      expect(cleanedData[0].days_in_stock).toBe(30);
      expect(cleanedData[0].mileage).toBe(15000);
      expect(cleanedData[1].days_in_stock).toBe(0);
      expect(cleanedData[1].mileage).toBe(0);
      expect(cleanedData[2].days_in_stock).toBe(0);
      expect(cleanedData[2].mileage).toBe(0);
      
      // Check that actions were recorded
      const fillActions = result.actions.filter(
        action => action.action === 'fill_missing' && action.method === 'zero'
      );
      expect(fillActions.length).toBe(2);
    });
    
    test('should fill missing string values with empty string', () => {
      const data = [
        { lead_source: 'Website', customer_name: 'John Doe' },
        { lead_source: null, customer_name: '' },
        { lead_source: undefined, customer_name: null }
      ];
      
      const [cleanedData, result] = cleanData(data, 'leads');
      
      // All records should have string values
      expect(cleanedData[0].lead_source).toBe('Website');
      expect(cleanedData[0].customer_name).toBe('John Doe');
      expect(cleanedData[1].lead_source).toBe('');
      expect(cleanedData[1].customer_name).toBe('');
      expect(cleanedData[2].lead_source).toBe('');
      expect(cleanedData[2].customer_name).toBe('');
      
      // Check that actions were recorded
      const fillActions = result.actions.filter(
        action => action.action === 'fill_missing' && action.method === 'empty_string'
      );
      expect(fillActions.length).toBe(2);
    });
  });
  
  describe('Text normalization', () => {
    test('should normalize lead source to title case', () => {
      const data = [
        { lead_source: 'website' },
        { lead_source: 'DEALER WEBSITE' },
        { lead_source: 'social media' }
      ];
      
      const [cleanedData, result] = cleanData(data, 'leads');
      
      // All lead sources should be in title case
      expect(cleanedData[0].lead_source).toBe('Website');
      expect(cleanedData[1].lead_source).toBe('Dealer Website');
      expect(cleanedData[2].lead_source).toBe('Social Media');
      
      // Check that actions were recorded
      const titleCaseActions = result.actions.filter(
        action => action.action === 'normalize_text' && action.method === 'title_case'
      );
      expect(titleCaseActions.length).toBe(1);
    });
    
    test('should normalize VIN to uppercase without spaces', () => {
      const data = [
        { vin: 'abc123' },
        { vin: 'DEF 456' },
        { vin: 'ghi 789' }
      ];
      
      const [cleanedData, result] = cleanData(data, 'inventory');
      
      // All VINs should be uppercase without spaces
      expect(cleanedData[0].vin).toBe('ABC123');
      expect(cleanedData[1].vin).toBe('DEF456');
      expect(cleanedData[2].vin).toBe('GHI789');
      
      // Check that actions were recorded
      const vinActions = result.actions.filter(
        action => action.action === 'normalize_vin'
      );
      expect(vinActions.length).toBe(1);
    });
  });
  
  describe('Date validation', () => {
    test('should fix future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const data = [
        { sale_date: new Date('2023-01-01') },
        { sale_date: futureDate }
      ];
      
      const [cleanedData, result] = cleanData(data, 'sales');
      
      // Future date should be replaced with current date
      expect(cleanedData[0].sale_date.getFullYear()).toBe(2023);
      expect(cleanedData[1].sale_date.getTime()).toBeLessThanOrEqual(new Date().getTime());
      
      // Check that actions were recorded
      const futureDateActions = result.actions.filter(
        action => action.action === 'fix_future_dates'
      );
      expect(futureDateActions.length).toBe(1);
    });
    
    test('should fix very old dates', () => {
      const data = [
        { sale_date: new Date('2023-01-01') },
        { sale_date: new Date('1980-01-01') }
      ];
      
      const [cleanedData, result] = cleanData(data, 'sales');
      
      // Old date should be replaced with a reasonable date
      expect(cleanedData[0].sale_date.getFullYear()).toBe(2023);
      expect(cleanedData[1].sale_date.getFullYear()).toBeGreaterThanOrEqual(2000);
      
      // Check that actions were recorded
      const oldDateActions = result.actions.filter(
        action => action.action === 'fix_old_dates'
      );
      expect(oldDateActions.length).toBe(1);
    });
  });
  
  describe('Edge cases', () => {
    test('should handle empty data', () => {
      const emptyData: Record<string, any>[] = [];
      const [cleanedData, result] = cleanData(emptyData, 'sales');
      
      expect(cleanedData).toEqual([]);
      expect(result.actions).toEqual([]);
      expect(result.rowCount.before).toBe(0);
      expect(result.rowCount.after).toBe(0);
    });
  });
});
