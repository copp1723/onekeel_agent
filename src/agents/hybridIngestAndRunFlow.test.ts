/**
 * Tests for the hybridIngestAndRunFlow module
 */
import { hybridIngestAndRunFlow, Logger } from './hybridIngestAndRunFlow.js';
import { ReportNotFoundError } from './ingestScheduledReport.js';
import { EnvVars } from '../types.js';

// Mock the required modules
jest.mock('./ingestScheduledReport.js', () => {
  return {
    tryFetchReportFromEmail: jest.fn(),
    ReportNotFoundError: class ReportNotFoundError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ReportNotFoundError';
      }
    }
  };
});

jest.mock('./runFlow.js', () => {
  return {
    runFlow: jest.fn()
  };
});

// Import the mocked modules
import { tryFetchReportFromEmail } from './ingestScheduledReport.js';
import { runFlow } from './runFlow.js';

// Test with a mock logger to capture log events
const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('hybridIngestAndRunFlow', () => {
  // Sample environment variables for testing
  const sampleEnvVars: EnvVars = {
    DOWNLOAD_DIR: './test-downloads',
    VIN_SOLUTIONS_USERNAME: 'test-user',
    VIN_SOLUTIONS_PASSWORD: 'test-password'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset mock logger
    (mockLogger.info as jest.Mock).mockReset();
    (mockLogger.warn as jest.Mock).mockReset();
    (mockLogger.error as jest.Mock).mockReset();
  });

  test('should use email ingestion when it succeeds', async () => {
    // Arrange
    const emailFilePath = './test-downloads/email-report.csv';
    (tryFetchReportFromEmail as jest.Mock).mockResolvedValue(emailFilePath);
    
    // Act
    const result = await hybridIngestAndRunFlow('VinSolutions', sampleEnvVars, mockLogger);
    
    // Assert
    expect(result).toBe(emailFilePath);
    expect(tryFetchReportFromEmail).toHaveBeenCalledWith('VinSolutions');
    expect(runFlow).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Starting hybrid ingestion'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully fetched report via EMAIL'), expect.any(Object));
  });

  test('should fallback to browser automation when email returns null', async () => {
    // Arrange
    const browserFilePath = './test-downloads/browser-report.csv';
    (tryFetchReportFromEmail as jest.Mock).mockResolvedValue(null);
    (runFlow as jest.Mock).mockResolvedValue(browserFilePath);
    
    // Act
    const result = await hybridIngestAndRunFlow('VinSolutions', sampleEnvVars, mockLogger);
    
    // Assert
    expect(result).toBe(browserFilePath);
    expect(tryFetchReportFromEmail).toHaveBeenCalledWith('VinSolutions');
    expect(runFlow).toHaveBeenCalledWith('VinSolutions', sampleEnvVars);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No report found in email'), expect.any(Object));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully fetched report via BROWSER'), expect.any(Object));
  });

  test('should fallback to browser automation when email throws ReportNotFoundError', async () => {
    // Arrange
    const browserFilePath = './test-downloads/browser-report.csv';
    (tryFetchReportFromEmail as jest.Mock).mockRejectedValue(new ReportNotFoundError('No scheduled report emails found'));
    (runFlow as jest.Mock).mockResolvedValue(browserFilePath);
    
    // Act
    const result = await hybridIngestAndRunFlow('VinSolutions', sampleEnvVars, mockLogger);
    
    // Assert
    expect(result).toBe(browserFilePath);
    expect(tryFetchReportFromEmail).toHaveBeenCalledWith('VinSolutions');
    expect(runFlow).toHaveBeenCalledWith('VinSolutions', sampleEnvVars);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No report found in email'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully fetched report via BROWSER'), expect.any(Object));
  });

  test('should propagate unexpected errors from email ingestion', async () => {
    // Arrange
    const fatalError = new Error('IMAP authentication failed');
    (tryFetchReportFromEmail as jest.Mock).mockRejectedValue(fatalError);
    
    // Act & Assert
    await expect(hybridIngestAndRunFlow('VinSolutions', sampleEnvVars, mockLogger))
      .rejects.toThrow('Hybrid ingestion failed (email)');
    
    expect(tryFetchReportFromEmail).toHaveBeenCalledWith('VinSolutions');
    expect(runFlow).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch report'), expect.any(Object));
  });

  test('should propagate errors from browser automation', async () => {
    // Arrange
    (tryFetchReportFromEmail as jest.Mock).mockResolvedValue(null);
    const browserError = new Error('Browser automation failed');
    (runFlow as jest.Mock).mockRejectedValue(browserError);
    
    // Act & Assert
    await expect(hybridIngestAndRunFlow('VinSolutions', sampleEnvVars, mockLogger))
      .rejects.toThrow('Hybrid ingestion failed (browser)');
    
    expect(tryFetchReportFromEmail).toHaveBeenCalledWith('VinSolutions');
    expect(runFlow).toHaveBeenCalledWith('VinSolutions', sampleEnvVars);
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch report'), expect.any(Object));
  });

  test('should normalize platform names correctly', async () => {
    // Arrange
    const browserFilePath = './test-downloads/browser-report.csv';
    (tryFetchReportFromEmail as jest.Mock).mockResolvedValue(null);
    (runFlow as jest.Mock).mockResolvedValue(browserFilePath);
    
    // Act
    const result = await hybridIngestAndRunFlow('vinsolutions', sampleEnvVars, mockLogger); // lowercase
    
    // Assert
    expect(result).toBe(browserFilePath);
    expect(tryFetchReportFromEmail).toHaveBeenCalledWith('VinSolutions'); // normalized
    expect(runFlow).toHaveBeenCalledWith('VinSolutions', sampleEnvVars); // normalized
  });
});