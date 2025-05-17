import { runFlow, waitForOTP } from '../../../src/src/../src/../agents/runFlow.js';
import { checkEmailForOTP } from '../../../src/src/../src/../utils/emailOTP.js';
import logger from '../../../src/src/../src/../utils/logger.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Mock the dependencies
vi.mock('playwright-core', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          fill: vi.fn().mockResolvedValue(undefined),
          click: vi.fn().mockResolvedValue(undefined),
          waitForSelector: vi.fn().mockResolvedValue(undefined),
          waitForNavigation: vi.fn().mockResolvedValue(undefined),
          waitForTimeout: vi.fn().mockResolvedValue(undefined),
          evaluate: vi.fn().mockResolvedValue(undefined),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
          close: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));
// Mock the emailOTP module
vi.mock('../../utils/emailOTP.js');
vi.mock('../../utils/logger.js');
describe('runFlow', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should execute flow steps successfully', async () => {
    const mockFlow = {
      steps: [
        {
          type: 'test',
          name: 'Test Step',
          config: {},
        },
      ],
    };
    const result = await runFlow(mockFlow);
    expect(result).toBeDefined();
  });
});
describe('waitForOTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should return OTP when found on first attempt', async () => {
    // Mock the checkEmailForOTP function to return an OTP
    (checkEmailForOTP as any).mockResolvedValue('123456');
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
    (checkEmailForOTP as any).mockResolvedValue(mockOTP);
    const result = await waitForOTP('test@example.com');
    expect(result).toBe(mockOTP);
  });
  it('should retry until OTP is found', async () => {
    // Mock the checkEmailForOTP function to return null first, then an OTP
    (checkEmailForOTP as any)
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
    (checkEmailForOTP as any).mockResolvedValue(null);
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
    (checkEmailForOTP as any).mockResolvedValue(null);
    await expect(waitForOTP('test@example.com', { maxAttempts: 1 })).rejects.toThrow(
      'Timed out waiting for OTP'
    );
  });
});
