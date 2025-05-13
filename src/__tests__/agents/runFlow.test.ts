import { runFlow, waitForOTP } from '../../agents/runFlow';
import { checkEmailForOTP } from '../../utils/emailOTP';

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
jest.mock('../../utils/emailOTP', () => ({
  checkEmailForOTP: jest.fn(),
}));

describe('runFlow', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('waitForOTP', () => {
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
  });
});
