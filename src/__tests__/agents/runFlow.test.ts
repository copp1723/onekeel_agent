import { runFlow, waitForOTP } from '../../agents/runFlow.js.js';
import { checkEmailForOTP } from '../../utils/emailOTP.js.js';
import logger from '../../utils/logger.js.js';
// Mock the dependencies
jest.mock('playwright-core', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue(undefined),
          fill: jest.fn().mockResolvedValue(undefined),
          click: jest.fn().mockResolvedValue(undefined),
          waitForSelector: jest.fn().mockResolvedValue(undefined),
          waitForNavigation: jest.fn().mockResolvedValue(undefined),
          waitForTimeout: jest.fn().mockResolvedValue(undefined),
          evaluate: jest.fn().mockResolvedValue(undefined),
          screenshot: jest.fn().mockResolvedValue(Buffer.from('test')),
          close: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
// Mock the emailOTP module
jest.mock('../../utils/emailOTP.js');
jest.mock('../../utils/logger.js');
describe('runFlow', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should execute flow steps successfully', async () => {
    const mockFlow = {
      steps: [
        {
          type: 'test',
          name: 'Test Step',
          config: {}
        }
      ]
    };
    const result = await runFlow(mockFlow);
    expect(result).toBeDefined();
  });
});
describe('waitForOTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return OTP when found on first attempt', async () => {
    // Mock the checkEmailForOTP function to return an OTP
    (checkEmailForOTP as jest.Mock).mockResolvedValue('123456');
    // Call the function
    const result = await waitForOTP({
      OTP_EMAIL_USER: 'test@example.com',
      OTP_EMAIL_PASS: 'password',
      EMAIL_HOST: 'imap.example.com',
      EMAIL_PORT: '993',
      EMAIL_TLS: 'true',
      OTP_PATTERN: 'OTP is: (\\d{6})',
      OTP_SUBJECT: 'Your OTP Code',
    });
    // Assertions
    expect(checkEmailForOTP).toHaveBeenCalledTimes(1);
    expect(result).toBe('123456');
  });
  it('should return OTP when found in email', async () => {
    const mockOTP = '123456';
    (checkEmailForOTP as jest.Mock).mockResolvedValue(mockOTP);
    const result = await waitForOTP('test@example.com');
    expect(result).toBe(mockOTP);
  });
  it('should retry until OTP is found', async () => {
    // Mock the checkEmailForOTP function to return null first, then an OTP
    (checkEmailForOTP as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('123456');
    // Call the function
    const result = await waitForOTP({
      OTP_EMAIL_USER: 'test@example.com',
      OTP_EMAIL_PASS: 'password',
      EMAIL_HOST: 'imap.example.com',
      EMAIL_PORT: '993',
      EMAIL_TLS: 'true',
      OTP_PATTERN: 'OTP is: (\\d{6})',
      OTP_SUBJECT: 'Your OTP Code',
    });
    // Assertions
    expect(checkEmailForOTP).toHaveBeenCalledTimes(3);
    expect(result).toBe('123456');
  });
  it('should return null after max attempts', async () => {
    // Mock the checkEmailForOTP function to always return null
    (checkEmailForOTP as jest.Mock).mockResolvedValue(null);
    // Call the function
    const result = await waitForOTP({
      OTP_EMAIL_USER: 'test@example.com',
      OTP_EMAIL_PASS: 'password',
      EMAIL_HOST: 'imap.example.com',
      EMAIL_PORT: '993',
      EMAIL_TLS: 'true',
      OTP_PATTERN: 'OTP is: (\\d{6})',
      OTP_SUBJECT: 'Your OTP Code',
    });
    // Assertions
    expect(checkEmailForOTP).toHaveBeenCalledTimes(5); // Default MAX_OTP_ATTEMPTS is 5
    expect(result).toBeNull();
  });
  it('should timeout if OTP not found', async () => {
    (checkEmailForOTP as jest.Mock).mockResolvedValue(null);
    await expect(waitForOTP('test@example.com', { maxAttempts: 1 }))
      .rejects
      .toThrow('Timed out waiting for OTP');
  });
});
