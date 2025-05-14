import path from 'path';
import fs from 'fs';
import { parseCSV } from '../src/utils/reportParsers.js';

describe('CSV Parsing', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'sample.csv');
  const hardFixturePath = path.resolve(__dirname, 'fixtures', '../../Downloads/watchdog data hard.csv');

  it('parses the sample CSV fixture and returns an array of objects', () => {
    const records = parseCSV(fixturePath);
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    expect(Object.keys(records[0]).length).toBeGreaterThan(0);
  });

  it('parses the provided hard CSV and returns an array of objects', () => {
    const records = parseCSV(hardFixturePath);
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toHaveProperty('GlobalCustomerID');
    expect(records[0]).toHaveProperty('VehicleModel');
  });

  it('throws an error for malformed CSV', () => {
    const malformedPath = path.join(__dirname, 'fixtures', 'malformed.csv');
    fs.writeFileSync(malformedPath, 'header1,header2\nvalue1'); // missing value for header2
    expect(() => parseCSV(malformedPath)).toThrow();
    fs.unlinkSync(malformedPath);
  });
});
