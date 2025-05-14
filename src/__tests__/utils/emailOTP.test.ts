import * as imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import { checkEmailForOTP, verifyOTP } from '../../utils/emailOTP.js.js';
// Mock the imap-simple module
jest.mock('imap-simple', () => ({
  connect: jest.fn(),
}));
// Mock the mailparser module
jest.mock('mailparser', () => ({
  simpleParser: jest.fn(),
}));
describe('emailOTP', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('checkEmailForOTP', () => {
    it('should return OTP when found in email', async () => {
      // Mock the connection
      const mockEnd = jest.fn().mockResolvedValue(undefined);
      const mockSearch = jest.fn().mockResolvedValue([
        {
          parts: [
            {
              which: 'TEXT',
              body: 'Email body with OTP',
            },
          ],
        },
      ]);
      const mockOpenBox = jest.fn().mockResolvedValue(undefined);
      // Setup the mock implementation
      (imap.connect as jest.Mock).mockResolvedValue({
        openBox: mockOpenBox,
        search: mockSearch,
        end: mockEnd,
      });
      // Mock the parser to return an OTP
      (simpleParser as jest.Mock).mockResolvedValue({
        text: 'Your OTP is: 123456 for verification.',
      });
      // Call the function
      const result = await checkEmailForOTP({
        user: 'test@example.com',
        password: 'password',
        host: 'imap.example.com',
        port: 993,
        tls: true,
      });
      // Assertions
      expect(imap.connect).toHaveBeenCalledTimes(1);
      expect(mockOpenBox).toHaveBeenCalledWith('INBOX');
      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(simpleParser).toHaveBeenCalledTimes(1);
      expect(mockEnd).toHaveBeenCalledTimes(1);
      expect(result).toBe('123456');
    });
    it('should return null when no emails are found', async () => {
      // Mock the connection
      const mockEnd = jest.fn().mockResolvedValue(undefined);
      const mockSearch = jest.fn().mockResolvedValue([]);
      const mockOpenBox = jest.fn().mockResolvedValue(undefined);
      // Setup the mock implementation
      (imap.connect as jest.Mock).mockResolvedValue({
        openBox: mockOpenBox,
        search: mockSearch,
        end: mockEnd,
      });
      // Call the function
      const result = await checkEmailForOTP({
        user: 'test@example.com',
        password: 'password',
        host: 'imap.example.com',
        port: 993,
        tls: true,
      });
      // Assertions
      expect(imap.connect).toHaveBeenCalledTimes(1);
      expect(mockOpenBox).toHaveBeenCalledWith('INBOX');
      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(simpleParser).not.toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
    it('should return null when connection fails', async () => {
      // Mock the connection to fail
      (imap.connect as jest.Mock).mockRejectedValue(new Error('Connection failed'));
      // Call the function
      const result = await checkEmailForOTP({
        user: 'test@example.com',
        password: 'password',
        host: 'imap.example.com',
        port: 993,
        tls: true,
      });
      // Assertions
      expect(imap.connect).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
    it('should handle timeout correctly', async () => {
      // Mock the connection to take longer than timeout
      (imap.connect as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              openBox: jest.fn().mockResolvedValue(undefined),
              search: jest.fn().mockResolvedValue([]),
              end: jest.fn().mockResolvedValue(undefined),
            });
          }, 100); // 100ms delay
        });
      });
      // Call the function with a very short timeout
      const result = await checkEmailForOTP({
        user: 'test@example.com',
        password: 'password',
        host: 'imap.example.com',
        port: 993,
        tls: true,
        timeoutMs: 50, // 50ms timeout (shorter than the delay)
      });
      // Assertions
      expect(imap.connect).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });
  describe('verifyOTP', () => {
    it('should return true when OTP matches', () => {
      const result = verifyOTP('123456', '123456');
      expect(result).toBe(true);
    });
    it('should return false when OTP does not match', () => {
      const result = verifyOTP('123456', '654321');
      expect(result).toBe(false);
    });
  });
});
