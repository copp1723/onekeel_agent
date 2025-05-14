/**
 * Tests for the emailIngestAndRunFlow module
 */
import { emailIngestAndRunFlow, Logger } from './hybridIngestAndRunFlow.js';
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

// Import the mocked modules
import { tryFetchReportFromEmail } from './ingestScheduledReport.js';

// Test with a mock logger to capture log events
const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('emailIngestAndRunFlow', () => {
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
    
    // Set up environment variables for email
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'test-password';
    process.env.EMAIL_HOST = 'imap.example.com';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_HOST;
  });

  test('should use email ingestion when it succeeds', async () => {
    // Arrange
    const emailFilePath = './test-downloads/email-report.csv';
    (tryFetchReportFromEmail as jest.Mock).mockResolvedValue(emailFilePath);
    
    // Act
    const result = await emailIngestAndRunFlow('VinSolutions', sampleEnvVars, mockLogger);
    
    // Assert
    expect(result).toBe(emailFilePath);
    expect(tryFetchReportFromEmail).toHaveBeenCalledWith('VinSolutions');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Starting email-only ingestion'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully fetched report via EMAIL'), expect.any(Object));
  });

  test('should throw error when email ingestion returns null', async () => {
    // Arrange
    (tryFetchReportFromEmail as jest.Mock).mockResolvedValue(null);
    
    // Act & Assert
    await expect(emailIngestAndRunFlow('VinSolutions', sampleEnvVars, mockLogger))
      .rejects.toThrow('Email ingestion failed: No report found for VinSolutions');
    
    expect(tryFetchReportFromEmail).toHaveBeenCalledWith('VinSolutions');
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('No report found in email'));
  });

  test('should throw error when email configuration is missing', async () => {
    // Arrange
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_HOST;
    
    // Act & Assert
    await expect(emailIngestAndRunFlow('VinSolutions', sampleEnvVars, mockLogger))
      .rejects.toThrow('Email ingestion failed: Missing required email configuration');
    
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Email configuration error'));
  });

  test('should throw error when email authentication fails', async () => {
    // Arrange
    (tryFetchReportFromEmail as jest.Mock).mockRejectedValue(new Error('Authentication failed'));
    
    // Act & Assert
    await expect(emailIngestAndRunFlow('VinSolutions', sampleEnvVars, mockLogger))
      .rejects.toThrow('Email ingestion failed: Authentication failed');
    
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Email authentication error'));
  });

  test('should normalize platform names correctly', async () => {
    // Arrange
    const emailFilePath = './test-downloads/email-report.csv';
    (tryFetchReportFromEmail as jest.Mock).mockResolvedValue(emailFilePath);
    
    // Act
    const result = await emailIngestAndRunFlow('vinsolutions', sampleEnvVars, mockLogger); // lowercase
    
    // Assert
    expect(result).toBe(emailFilePath);
    expect(tryFetchReportFromEmail).toHaveBeenCalledWith('VinSolutions'); // normalized
  });
});
