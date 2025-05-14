import { initializeInsightWorker } from '../insightWorker';
import { createWorker, QUEUE_NAMES } from '../../services/bullmqService';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/bullmqService');
jest.mock('../../utils/logger');

describe('insightWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize insight worker with correct configuration', () => {
    const mockCreateWorker = createWorker as jest.Mock;
    
    initializeInsightWorker();

    expect(mockCreateWorker).toHaveBeenCalledWith(
      QUEUE_NAMES.INSIGHT,
      expect.any(Function),
      {
        concurrency: 2,
        limiter: {
          max: 2,
          duration: 1000
        }
      }
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'insight_worker_initialized'
      }),
      expect.any(String)
    );
  });

  it('should handle initialization errors', () => {
    const mockError = new Error('Test error');
    (createWorker as jest.Mock).mockImplementationOnce(() => {
      throw mockError;
    });

    initializeInsightWorker();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'insight_worker_init_error',
        errorMessage: 'Test error'
      }),
      expect.any(String)
    );
  });

  it('should use default concurrency when env var is not set', () => {
    delete process.env.INSIGHT_WORKER_CONCURRENCY;
    const mockCreateWorker = createWorker as jest.Mock;

    initializeInsightWorker();

    expect(mockCreateWorker).toHaveBeenCalledWith(
      QUEUE_NAMES.INSIGHT,
      expect.any(Function),
      expect.objectContaining({
        concurrency: 2
      })
    );
  });

  it('should respect custom concurrency from env var', () => {
    process.env.INSIGHT_WORKER_CONCURRENCY = '4';
    const mockCreateWorker = createWorker as jest.Mock;

    initializeInsightWorker();

    expect(mockCreateWorker).toHaveBeenCalledWith(
      QUEUE_NAMES.INSIGHT,
      expect.any(Function),
      expect.objectContaining({
        concurrency: 4
      })
    );
  });
});