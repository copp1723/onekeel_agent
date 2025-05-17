/**
 * Tests for Results Persistence Service
 */
import fs from 'fs';
import path from 'path';
import {
  createResultsDirectory,
  storeResultsToFile,
  checkForDuplicateReport,
  storeReportSource,
  storeReportData,
  storeResults,
} from '../../../src/src/../src/../services/resultsPersistence.js';
import { db } from '../../../src/src/../src/../db/index.js';
import { reports, reportSources } from '../../../src/src/../src/../shared/report-schema.js';
import { FileType } from '../../../src/src/../src/../services/attachmentParsers.js';
// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn((filePath) => filePath.split('/').pop()),
}));
// Mock db
jest.mock('../../db/index', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue({ insertId: 1 }),
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));
// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));
describe('Results Persistence Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createResultsDirectory', () => {
    it('should create directories if they do not exist', () => {
      // Arrange
      const vendor = 'TestVendor';
      // Act
      const result = createResultsDirectory(vendor);
      // Assert
      expect(fs.existsSync).toHaveBeenCalledTimes(2);
      expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
      expect(result).toBe(process.cwd() + '/results/TestVendor');
    });
    it('should not create directories if they already exist', () => {
      // Arrange
      const vendor = 'TestVendor';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      // Act
      const result = createResultsDirectory(vendor);
      // Assert
      expect(fs.existsSync).toHaveBeenCalledTimes(2);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(result).toBe(process.cwd() + '/results/TestVendor');
    });
  });
  describe('storeResultsToFile', () => {
    it('should store results to a file', () => {
      // Arrange
      const vendor = 'TestVendor';
      const data = {
        id: 'test-id',
        records: [{ name: 'John', age: 30 }],
        recordCount: 1,
        metadata: {
          fileType: FileType.CSV,
          fileName: 'test.csv',
          parseDate: '2023-01-01T00:00:00.000Z',
        },
      };
      const reportId = 'test-report-id';
      // Act
      const result = storeResultsToFile(vendor, data, reportId);
      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(reportId),
        expect.any(String)
      );
      expect(result).toContain(reportId);
    });
  });
  describe('checkForDuplicateReport', () => {
    it('should return null if no duplicate is found', async () => {
      // Arrange
      const vendor = 'TestVendor';
      const recordCount = 10;
      const metadata = { fileName: 'test.csv' };
      // Act
      const result = await checkForDuplicateReport(vendor, recordCount, metadata);
      // Assert
      expect(result).toBeNull();
    });
    it('should return the report ID if a duplicate is found', async () => {
      // Arrange
      const vendor = 'TestVendor';
      const recordCount = 10;
      const metadata = { fileName: 'test.csv' };
      // Mock db to return a matching report
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                id: 'existing-report-id',
                metadata: { fileName: 'test.csv' },
              },
            ]),
          }),
        }),
      });
      // Act
      const result = await checkForDuplicateReport(vendor, recordCount, metadata);
      // Assert
      expect(result).toBe('existing-report-id');
    });
  });
  describe('storeReportSource', () => {
    it('should store report source information', async () => {
      // Arrange
      const sourceInfo = {
        vendor: 'TestVendor',
        sourceType: 'email',
        emailSubject: 'Test Subject',
        emailFrom: 'test@example.com',
        emailDate: new Date(),
        filePath: 'test.csv',
        metadata: { test: true },
      };
      // Act
      const result = await storeReportSource(sourceInfo);
      // Assert
      expect(db.insert).toHaveBeenCalledWith(reportSources);
      expect(result).toBe('test-uuid');
    });
  });
  describe('storeReportData', () => {
    it('should store report data', async () => {
      // Arrange
      const reportData = {
        sourceId: 'source-id',
        reportData: {
          id: 'test-id',
          records: [{ name: 'John', age: 30 }],
          recordCount: 1,
          metadata: {
            fileType: FileType.CSV,
            fileName: 'test.csv',
            parseDate: '2023-01-01T00:00:00.000Z',
          },
        },
        recordCount: 1,
        vendor: 'TestVendor',
        reportDate: new Date(),
        reportType: 'sales_report',
        status: 'pending_analysis' as const,
        metadata: { test: true },
      };
      // Act
      const result = await storeReportData(reportData);
      // Assert
      expect(db.insert).toHaveBeenCalledWith(reports);
      expect(result).toBe('test-uuid');
    });
    it('should return existing report ID if duplicate is found', async () => {
      // Arrange
      const reportData = {
        sourceId: 'source-id',
        reportData: {
          id: 'test-id',
          records: [{ name: 'John', age: 30 }],
          recordCount: 1,
          metadata: {
            fileType: FileType.CSV,
            fileName: 'test.csv',
            parseDate: '2023-01-01T00:00:00.000Z',
          },
        },
        recordCount: 1,
        vendor: 'TestVendor',
        reportDate: new Date(),
        reportType: 'sales_report',
        status: 'pending_analysis' as const,
        metadata: { fileName: 'test.csv' },
      };
      // Mock checkForDuplicateReport to return an ID
      jest.spyOn(global, 'checkForDuplicateReport' as any).mockResolvedValue('existing-report-id');
      // Act
      const result = await storeReportData(reportData);
      // Assert
      expect(result).toBe('existing-report-id');
      expect(db.insert).not.toHaveBeenCalled();
    });
  });
  describe('storeResults', () => {
    it('should store results in both filesystem and database', async () => {
      // Arrange
      const vendor = 'TestVendor';
      const parserResult = {
        id: 'test-id',
        records: [{ name: 'John', age: 30 }],
        recordCount: 1,
        metadata: {
          fileType: FileType.CSV,
          fileName: 'test.csv',
          parseDate: '2023-01-01T00:00:00.000Z',
          reportType: 'sales_report',
        },
      };
      const sourceInfo = {
        sourceType: 'email',
        emailSubject: 'Test Subject',
        emailFrom: 'test@example.com',
        emailDate: new Date(),
        filePath: 'test.csv',
        metadata: { test: true },
      };
      // Mock storeResultsToFile
      jest.spyOn(global, 'storeResultsToFile' as any).mockReturnValue('test/path.json');
      // Mock storeReportSource
      jest.spyOn(global, 'storeReportSource' as any).mockResolvedValue('source-id');
      // Mock storeReportData
      jest.spyOn(global, 'storeReportData' as any).mockResolvedValue('report-id');
      // Act
      const result = await storeResults(vendor, parserResult, sourceInfo);
      // Assert
      expect(result).toEqual({
        id: 'report-id',
        filePath: 'test.csv',
        jsonPath: 'test/path.json',
        sourceId: 'source-id',
        recordCount: 1,
        vendor: 'TestVendor',
        reportType: 'sales_report',
        status: 'pending_analysis',
        metadata: expect.objectContaining({
          fileType: FileType.CSV,
          fileName: 'test.csv',
          sourceInfo: { test: true },
        }),
      });
    });
  });
});
