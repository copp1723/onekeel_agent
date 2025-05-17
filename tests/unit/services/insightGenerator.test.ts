/**
 * Tests for Insight Generator Service
 */
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import {
  logInsightRun,
  saveResult,
  storeInsight,
  generateInsights,
  InsightResponseSchema,
} from '../../../src/src/../src/../services/insightGenerator.js';
import { db } from '../../../src/src/../src/../db/index.js';
import { insights } from '../../../src/src/../src/../shared/report-schema.js';
import { FileType } from '../../../src/src/../src/../services/attachmentParsers.js';
// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
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
  },
}));
// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));
// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: 'Test Insight',
                  description: 'This is a test insight',
                  summary: 'Test summary',
                  actionItems: [
                    {
                      title: 'Action 1',
                      description: 'Do something',
                      priority: 'high',
                    },
                  ],
                  metrics: [
                    {
                      name: 'Metric 1',
                      value: 42,
                      trend: 'up',
                    },
                  ],
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));
describe('Insight Generator Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });
  describe('logInsightRun', () => {
    it('should log insight run data', () => {
      // Arrange
      const logData = {
        platform: 'TestVendor',
        promptIntent: 'automotive_analysis',
        promptVersion: '1.0.0',
        durationMs: 1000,
        outputSummary: ['Test Insight'],
      };
      // Act
      logInsightRun(logData);
      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();
    });
  });
  describe('saveResult', () => {
    it('should save insight result to file', () => {
      // Arrange
      const platform = 'TestVendor';
      const insightData = {
        title: 'Test Insight',
        description: 'This is a test insight',
        summary: 'Test summary',
        actionItems: [
          {
            title: 'Action 1',
            description: 'Do something',
            priority: 'high',
          },
        ],
      };
      const filename = 'test-insight';
      const metadata = {
        promptIntent: 'automotive_analysis',
        promptVersion: '1.0.0',
        durationMs: 1000,
      };
      // Act
      const result = saveResult(platform, insightData, filename, metadata);
      // Assert
      expect(fs.existsSync).toHaveBeenCalledTimes(2);
      expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toContain(filename);
    });
  });
  describe('storeInsight', () => {
    it('should store insight in database', async () => {
      // Arrange
      const reportId = 'test-report-id';
      const insightData = {
        title: 'Test Insight',
        description: 'This is a test insight',
        summary: 'Test summary',
        actionItems: [
          {
            title: 'Action 1',
            description: 'Do something',
            priority: 'high',
          },
        ],
      };
      const metadata = {
        promptVersion: '1.0.0',
        modelVersion: 'gpt-4o',
        durationMs: 1000,
        overallScore: 8,
        qualityScores: { relevance: 9, clarity: 8 },
        businessImpact: { revenue: 'high', cost: 'medium' },
      };
      // Act
      const result = await storeInsight(reportId, insightData, metadata);
      // Assert
      expect(db.insert).toHaveBeenCalledWith(insights);
      expect(result).toBe('test-uuid');
    });
  });
  describe('generateInsights', () => {
    it('should generate insights from parsed data', async () => {
      // Arrange
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
      const platform = 'TestVendor';
      const options = {
        intent: 'automotive_analysis',
        promptVersion: '1.0.0',
        modelVersion: 'gpt-4o',
        sampleSize: 1,
      };
      // Mock saveResult
      jest.spyOn(global, 'saveResult' as any).mockReturnValue('test/path.json');
      // Mock storeInsight
      jest.spyOn(global, 'storeInsight' as any).mockResolvedValue('insight-id');
      // Act
      const result = await generateInsights(data, platform, options);
      // Assert
      expect(result).toEqual({
        insightId: 'insight-id',
        insight: expect.objectContaining({
          title: 'Test Insight',
          description: 'This is a test insight',
          summary: 'Test summary',
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              title: 'Action 1',
              description: 'Do something',
            }),
          ]),
        }),
        metadata: expect.objectContaining({
          promptVersion: expect.any(String),
          modelVersion: 'gpt-4o',
          platform: 'TestVendor',
          intent: 'automotive_analysis',
          sampleSize: 1,
          outputPath: 'test/path.json',
        }),
      });
    });
    it('should handle errors during insight generation', async () => {
      // Arrange
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
      const platform = 'TestVendor';
      // Mock OpenAI to throw an error
      (OpenAI as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API error')),
          },
        },
      }));
      // Act & Assert
      await expect(generateInsights(data, platform)).rejects.toThrow('API error');
    });
  });
  describe('InsightResponseSchema', () => {
    it('should validate valid insight responses', () => {
      // Arrange
      const validInsight = {
        title: 'Test Insight',
        description: 'This is a test insight',
        summary: 'Test summary',
        actionItems: [
          {
            title: 'Action 1',
            description: 'Do something',
            priority: 'high',
          },
        ],
        metrics: [
          {
            name: 'Metric 1',
            value: 42,
            trend: 'up',
          },
        ],
        charts: [
          {
            title: 'Chart 1',
            type: 'bar',
            data: { labels: ['A', 'B'], values: [1, 2] },
          },
        ],
      };
      // Act & Assert
      expect(() => InsightResponseSchema.parse(validInsight)).not.toThrow();
    });
    it('should reject invalid insight responses', () => {
      // Arrange
      const invalidInsight = {
        title: 'Test Insight',
        // Missing required fields
        actionItems: [],
      };
      // Act & Assert
      expect(() => InsightResponseSchema.parse(invalidInsight)).toThrow();
    });
  });
});
