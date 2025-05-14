import { processInsightJob } from '../insightProcessingWorker';
import { db } from '../../shared/db';
import logger from '../../utils/logger';
import { generateInsightFromReport } from '../generateInsightFromReport';

// Mock dependencies
jest.mock('../../shared/db');
jest.mock('../../utils/logger');
jest.mock('../generateInsightFromReport');

describe('insightProcessingWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process insight generation job successfully', async () => {
    const mockJob = {
      id: 'test-job-1',
      name: 'INSIGHT_GENERATION',
      data: {
        taskId: 'test-task-1',
        reportId: 'test-report-1',
        platform: 'VinSolutions',
        options: {
          role: 'Executive'
        }
      }
    };

    const mockInsightResult = {
      insightId: 'test-insight-1',
      summary: 'Test summary',
      value_insights: ['Insight 1', 'Insight 2'],
      actionable_flags: ['Action 1', 'Action 2'],
      confidence: 'high'
    };

    (generateInsightFromReport as jest.Mock).mockResolvedValue(mockInsightResult);
    (db.update as jest.Mock).mockResolvedValue({ rowCount: 1 });

    const result = await processInsightJob(mockJob as any);

    expect(result).toEqual(mockInsightResult);
    expect(db.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'completed',
        result: JSON.stringify(mockInsightResult)
      })
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'insight_job_completed'
      }),
      expect.any(String)
    );
  });

  it('should handle task ID validation', async () => {
    const mockJob = {
      id: 'test-job-2',
      name: 'INSIGHT_GENERATION',
      data: {
        reportId: 'test-report-2',
        platform: 'VinSolutions'
      }
    };

    await expect(processInsightJob(mockJob as any)).rejects.toThrow('Job data missing taskId');
  });

  it('should handle insight generation errors', async () => {
    const mockJob = {
      id: 'test-job-3',
      name: 'INSIGHT_GENERATION',
      data: {
        taskId: 'test-task-3',
        reportId: 'test-report-3',
        platform: 'VinSolutions'
      }
    };

    const mockError = new Error('Insight generation failed');
    (generateInsightFromReport as jest.Mock).mockRejectedValue(mockError);

    await expect(processInsightJob(mockJob as any)).rejects.toThrow('Insight generation failed');
    expect(db.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'failed',
        error: 'Insight generation failed'
      })
    );
  });
});