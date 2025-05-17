import { describe, it, expect, beforeAll, vi, afterEach, beforeEach } from 'vitest';
import { resetAllMocks } from '../../__tests__/test-utils.js';

// 1. Create the mock functions
const mockCreate = vi.fn();

// 2. Mock the openai module before importing the module under test
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

// 3. Now import the module under test
import { scoreInsightQuality } from '../insightScorer.js';

interface TestInsight {
  summary: string;
  details: string;
  actionItems: string[];
  dataPoints: Array<{
    name: string;
    value: number;
    change: number;
    unit: string;
  }>;
}

describe('Insight Scorer', () => {
  // Set up test environment
  beforeAll(() => {
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-key';
  });

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Set up the default mock implementation for the success case
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            score: 8,
            feedback: 'Good insight',
            strengths: ['Specific', 'Actionable'],
            weaknesses: ['Could use more data points']
          })
        }
      }]
    });
  });

  // Reset mocks between tests
  afterEach(() => {
    resetAllMocks();
  });

  describe('scoreInsightQuality', () => {
    let testInsight: TestInsight;

    beforeEach(() => {
      testInsight = {
        summary: 'Test insight',
        details: 'This is a test insight for scoring',
        actionItems: ['Test action item 1', 'Test action item 2'],
        dataPoints: [
          { 
            name: 'Test Metric', 
            value: 100, 
            change: 10, 
            unit: '%' 
          }
        ]
      };
    });

    it('should return a valid score for a valid insight', async () => {
      const result = await scoreInsightQuality(testInsight);

      expect(result).toEqual({
        score: 8,
        feedback: 'Good insight',
        strengths: ['Specific', 'Actionable'],
        weaknesses: ['Could use more data points'],
        timestamp: expect.any(String)
      });
    });

    it('should handle missing optional fields', async () => {
      // Mock an error response for this test case
      const error = new Error('Cannot read properties of undefined (reading \'completions\')');
      mockCreate.mockRejectedValueOnce(error);

      const minimalInsight: Partial<TestInsight> = {
        summary: 'Minimal test insight',
        details: 'This is a minimal test insight',
        actionItems: [],
        dataPoints: []
      };

      const result = await scoreInsightQuality(minimalInsight as TestInsight);
      
      // Verify the error response structure
      expect(result).toMatchObject({
        score: -1,
        feedback: expect.stringContaining('Error scoring insight'),
        strengths: expect.any(Array),
        weaknesses: expect.any(Array),
        timestamp: expect.any(String)
      });
      
      // Verify the error message is included in the feedback
      expect(result.feedback).toContain('Cannot read properties of undefined');
    });

    it('should handle API call failures gracefully', async () => {
      // Mock a failed API response
      const error = new Error('API Error');
      mockCreate.mockRejectedValueOnce(error);

      const result = await scoreInsightQuality(testInsight);
      
      expect(result).toMatchObject({
        score: -1,
        feedback: expect.stringContaining('Error scoring insight'),
        strengths: [],
        weaknesses: expect.arrayContaining([expect.any(String)]),
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid JSON response from the API', async () => {
      // Mock an invalid JSON response
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'invalid json'
          }
        }]
      });

      const result = await scoreInsightQuality(testInsight);
      
      expect(result).toMatchObject({
        score: -1,
        feedback: expect.stringContaining('Error scoring insight'),
        strengths: [],
        weaknesses: expect.arrayContaining([expect.any(String)]),
        timestamp: expect.any(String)
      });
    });

    it('should handle missing required fields in the response', async () => {
      // Mock a response missing required fields
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              // Missing required fields
              feedback: 'Incomplete response'
            })
          }
        }]
      });

      const result = await scoreInsightQuality(testInsight);
      
      expect(result).toMatchObject({
        score: -1,
        feedback: expect.stringContaining('Error scoring insight'),
        strengths: [],
        weaknesses: expect.arrayContaining([expect.any(String)]),
        timestamp: expect.any(String)
      });
    });
  });

  describe('error handling', () => {
    it('should handle null or undefined input', async () => {
      // Test with null input
      const nullResult = await scoreInsightQuality(null as any);
      expect(nullResult).toMatchObject({
        score: -1,
        feedback: expect.stringContaining('Error scoring insight'),
        strengths: [],
        weaknesses: expect.arrayContaining([expect.any(String)]),
        timestamp: expect.any(String)
      });
      
      // Test with undefined input
      const undefinedResult = await scoreInsightQuality(undefined as any);
      expect(undefinedResult).toMatchObject({
        score: -1,
        feedback: expect.stringContaining('Error scoring insight'),
        strengths: [],
        weaknesses: expect.arrayContaining([expect.any(String)]),
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid insight data structure', async () => {
      const invalidInsight = {
        // Missing required fields
        foo: 'bar'
      };
      
      const result = await scoreInsightQuality(invalidInsight as any);
      expect(result).toMatchObject({
        score: -1,
        feedback: expect.stringContaining('Error scoring insight'),
        strengths: [],
        weaknesses: expect.arrayContaining([expect.any(String)]),
        timestamp: expect.any(String)
      });
    });
  });
});
