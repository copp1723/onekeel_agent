import { generateInsights } from '../aiInsightService.js';
import { OpenAI } from 'openai';
import { db } from '../../utils/db.js';
// Mock OpenAI and database
jest.mock('openai');
jest.mock('../../utils/db');
describe('aiInsightService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });
  it('should generate insights successfully', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Test summary',
              value_insights: ['Insight 1', 'Insight 2'],
              actionable_flags: ['Action 1', 'Action 2'],
              confidence: 'high',
            }),
          },
        },
      ],
    };
    (OpenAI as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse),
        },
      },
    }));
    const result = await generateInsights({
      salesData: [{ vehicle: 'Test', amount: 1000 }],
    });
    expect(result).toEqual({
      summary: 'Test summary',
      value_insights: ['Insight 1', 'Insight 2'],
      actionable_flags: ['Action 1', 'Action 2'],
      confidence: 'high',
    });
    // Verify logging
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO insight_logs'),
      expect.arrayContaining([true])
    );
  });
  it('should handle API failures with retries', async () => {
    const error = new Error('API Error');
    (OpenAI as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(error),
        },
      },
    }));
    await expect(
      generateInsights({
        salesData: [{ vehicle: 'Test', amount: 1000 }],
      })
    ).rejects.toThrow('Failed to generate insights after 3 attempts');
    // Verify error logging
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO insight_logs'),
      expect.arrayContaining([false])
    );
  });
  it('should validate OpenAI API key at startup', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => require('../aiInsightService')).toThrow(
      'OPENAI_API_KEY environment variable is not configured'
    );
  });
  it('should use role-specific prompts', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Executive summary',
              value_insights: ['Executive insight'],
              actionable_flags: ['Executive action'],
              confidence: 'high',
            }),
          },
        },
      ],
    };
    (OpenAI as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse),
        },
      },
    }));
    const result = await generateInsights(
      {
        salesData: [{ vehicle: 'Test', amount: 1000 }],
      },
      { role: 'Executive' }
    );
    expect(result.summary).toBe('Executive summary');
  });
});
