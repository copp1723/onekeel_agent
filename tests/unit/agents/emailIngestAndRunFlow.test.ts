/**
 * Tests for Email Ingestion and Run Flow
 */
import fs from 'fs';
import { jest } from '@jest/globals'; // Ensure jest is imported
import path from 'path';
import { emailIngestAndRunFlow, createSampleReport, runSampleDataFlow } from '....js';
import { tryFetchReportFromEmail } from '../../../src/src/../src/../agents/ingestScheduledReport.js';
import { parseByExtension } from '../../../src/src/../src/../services/attachmentParsers.js';
import { storeResults } from '../../../src/src/../src/../services/resultsPersistence.js';
import { generateInsights } from '../../../src/src/../src/../services/insightGenerator.js';
// Mock dependencies
jest.mock('../../agents/ingestScheduledReport.js');
jest.mock('../../services/attachmentParsers.js');
jest.mock('../../services/resultsPersistence.js');
jest.mock('../../services/insightGenerator.js');
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
describe('Email Ingestion and Run Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('emailIngestAndRunFlow', () => {
    it('should execute the complete flow successfully', async () => {
      // Arrange
      const platform = 'TestVendor';
      const envVars = {
        LAST_EMAIL_SUBJECT: 'Test Subject',
        LAST_EMAIL_FROM: 'test@example.com',
        LAST_EMAIL_DATE: '2023-01-01T00:00:00.000Z',
      };
      const logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };
      // Mock tryFetchReportFromEmail
      (tryFetchReportFromEmail as jest.Mock).mockResolvedValue('test.csv');
      // Mock parseByExtension
      (parseByExtension as jest.Mock).mockResolvedValue({
        id: 'test-id',
        records: [{ name: 'John', age: 30 }],
        recordCount: 1,
        metadata: {
          fileName: 'test.csv',
          parseDate: '2023-01-01T00:00:00.000Z',
        },
      });
      // Mock storeResults
      (storeResults as jest.Mock).mockResolvedValue({
        id: 'report-id',
        filePath: 'test.csv',
        jsonPath: 'results/TestVendor/2023-01-01-report-id.json',
        sourceId: 'source-id',
        recordCount: 1,
        vendor: 'TestVendor',
        status: 'pending_analysis',
        metadata: {},
      });
      // Mock generateInsights
      (generateInsights as jest.Mock).mockResolvedValue({
        insightId: 'insight-id',
        insight: {
          title: 'Test Insight',
          description: 'This is a test insight',
          summary: 'Test summary',
          actionItems: [],
        },
        metadata: {
          outputPath: 'insights/TestVendor/insight_123456789.json',
        },
      });
      // Act
      const result = await emailIngestAndRunFlow(platform, envVars, logger);
      // Assert
      expect(tryFetchReportFromEmail).toHaveBeenCalledWith(platform);
      expect(parseByExtension).toHaveBeenCalledWith('test.csv', expect.any(Object));
      expect(storeResults).toHaveBeenCalled();
      expect(generateInsights).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledTimes(5);
      expect(result).toEqual({
        reportId: 'report-id',
        reportPath: 'test.csv',
        jsonPath: 'results/TestVendor/2023-01-01-report-id.json',
        insightId: 'insight-id',
        insightPath: 'insights/TestVendor/insight_123456789.json',
      });
    });
    it('should skip insight generation when skipInsights is true', async () => {
      // Arrange
      const platform = 'TestVendor';
      const envVars = {};
      const logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };
      const options = { skipInsights: true };
      // Mock tryFetchReportFromEmail
      (tryFetchReportFromEmail as jest.Mock).mockResolvedValue('test.csv');
      // Mock parseByExtension
      (parseByExtension as jest.Mock).mockResolvedValue({
        id: 'test-id',
        records: [{ name: 'John', age: 30 }],
        recordCount: 1,
        metadata: {
          fileName: 'test.csv',
          parseDate: '2023-01-01T00:00:00.000Z',
        },
      });
      // Mock storeResults
      (storeResults as jest.Mock).mockResolvedValue({
        id: 'report-id',
        filePath: 'test.csv',
        jsonPath: 'results/TestVendor/2023-01-01-report-id.json',
        sourceId: 'source-id',
        recordCount: 1,
        vendor: 'TestVendor',
        status: 'pending_analysis',
        metadata: {},
      });
      // Act
      const result = await emailIngestAndRunFlow(platform, envVars, logger, options);
      // Assert
      expect(tryFetchReportFromEmail).toHaveBeenCalledWith(platform);
      expect(parseByExtension).toHaveBeenCalledWith('test.csv', expect.any(Object));
      expect(storeResults).toHaveBeenCalled();
      expect(generateInsights).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        reportId: 'report-id',
        reportPath: 'test.csv',
        jsonPath: 'results/TestVendor/2023-01-01-report-id.json',
      });
    });
    it('should handle errors during the flow', async () => {
      // Arrange
      const platform = 'TestVendor';
      const envVars = {};
      const logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };
      // Mock tryFetchReportFromEmail to throw an error
      (tryFetchReportFromEmail as jest.Mock).mockRejectedValue(new Error('Email fetch error'));
      // Act & Assert
      await expect(emailIngestAndRunFlow(platform, envVars, logger)).rejects.toThrow(
        'Email fetch error'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
  describe('createSampleReport', () => {
    it('should create a sample report file', async () => {
      // Arrange
      const platform = 'TestVendor';
      process.env.DOWNLOAD_DIR = './downloads';
      // Act
      const result = await createSampleReport(platform);
      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toContain(platform);
    });
  });
  describe('runSampleDataFlow', () => {
    it('should run the sample data flow successfully', async () => {
      // Arrange
      const platform = 'TestVendor';
      // Mock createSampleReport
      jest.spyOn(global, 'createSampleReport' as any).mockResolvedValue('test.csv');
      // Mock parseByExtension
      (parseByExtension as jest.Mock).mockResolvedValue({
        id: 'test-id',
        records: [{ name: 'John', age: 30 }],
        recordCount: 1,
        metadata: {
          fileName: 'test.csv',
          parseDate: '2023-01-01T00:00:00.000Z',
        },
      });
      // Mock storeResults
      (storeResults as jest.Mock).mockResolvedValue({
        id: 'report-id',
        filePath: 'test.csv',
        jsonPath: 'results/TestVendor/2023-01-01-report-id.json',
        sourceId: 'source-id',
        recordCount: 1,
        vendor: 'TestVendor',
        status: 'pending_analysis',
        metadata: {},
      });
      // Mock generateInsights
      (generateInsights as jest.Mock).mockResolvedValue({
        insightId: 'insight-id',
        insight: {
          title: 'Test Insight',
          description: 'This is a test insight',
          summary: 'Test summary',
          actionItems: [],
        },
        metadata: {
          outputPath: 'insights/TestVendor/insight_123456789.json',
        },
      });
      // Act
      const result = await runSampleDataFlow(platform);
      // Assert
      expect(parseByExtension).toHaveBeenCalledWith('test.csv', expect.any(Object));
      expect(storeResults).toHaveBeenCalled();
      expect(generateInsights).toHaveBeenCalled();
      expect(result).toEqual({
        reportId: 'report-id',
        reportPath: 'test.csv',
        jsonPath: 'results/TestVendor/2023-01-01-report-id.json',
        insightId: 'insight-id',
        insightPath: 'insights/TestVendor/insight_123456789.json',
      });
    });
  });
});
