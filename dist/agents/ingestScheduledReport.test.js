/**
 * Tests for the ingestScheduledReport module
 */
import * as fs from 'fs';
import { ingestScheduledReport, ReportNotFoundError } from './ingestScheduledReport.js';
// Since we don't have jest globals, we'll make our own mock functions
const jest = {
    fn: () => {
        const mockFn = (...args) => {
            mockFn.mock.calls.push(args);
            return mockFn.mockReturnValue;
        };
        mockFn.mock = { calls: [] };
        mockFn.mockResolvedValue = (value) => {
            mockFn.mockReturnValue = Promise.resolve(value);
            return mockFn;
        };
        mockFn.mockRejectedValue = (error) => {
            mockFn.mockReturnValue = Promise.reject(error);
            return mockFn;
        };
        mockFn.mockReturnValue = undefined;
        mockFn.mockClear = () => {
            mockFn.mock.calls = [];
        };
        return mockFn;
    },
    clearAllMocks: () => {
        // We'll implement this as needed
    }
};
// Mock the entire imap-simple module
jest.mock('imap-simple', () => {
    // Create a mock implementation
    return {
        connect: jest.fn()
    };
});
// Mock mailparser
jest.mock('mailparser', () => {
    return {
        simpleParser: jest.fn()
    };
});
// Mock fs
jest.mock('fs', () => {
    return {
        ...jest.requireActual('fs'),
        promises: {
            mkdir: jest.fn().mockResolvedValue(undefined),
            writeFile: jest.fn().mockResolvedValue(undefined)
        }
    };
});
// Import the mocked modules
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
describe('ingestScheduledReport', () => {
    // Setup environment variables for tests
    const originalEnv = process.env;
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        // Setup test environment variables
        process.env = {
            ...originalEnv,
            EMAIL_USER: 'test@example.com',
            EMAIL_PASS: 'password123',
            EMAIL_HOST: 'imap.example.com',
            EMAIL_PORT: '993',
            EMAIL_TLS: 'true'
        };
        // Setup fs mock
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.writeFile.mockResolvedValue(undefined);
    });
    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });
    test('should throw ReportNotFoundError when no emails found', async () => {
        // Mock IMAP connection with empty results
        const mockConnection = {
            openBox: jest.fn().mockResolvedValue({}),
            search: jest.fn().mockResolvedValue([]),
            end: jest.fn().mockResolvedValue(undefined),
            addFlags: jest.fn().mockResolvedValue(undefined)
        };
        imaps.connect.mockResolvedValue(mockConnection);
        // Call the function and expect it to throw
        await expect(ingestScheduledReport('VinSolutions', './downloads'))
            .rejects.toThrow(ReportNotFoundError);
        // Verify IMAP functions were called
        expect(mockConnection.openBox).toHaveBeenCalledWith('INBOX');
        expect(mockConnection.search).toHaveBeenCalled();
        expect(mockConnection.end).toHaveBeenCalled();
    });
    test('should return file path when a single email with attachment is found', async () => {
        // Create mock email data
        const attachmentContent = Buffer.from('test,data\n1,2\n3,4');
        const mockEmail = {
            attributes: { uid: '123' },
            parts: [
                { which: '', body: 'raw email body' }
            ]
        };
        // Mock parsed email with attachment
        const mockParsedEmail = {
            subject: 'Test Report',
            attachments: [
                {
                    filename: 'report.csv',
                    content: attachmentContent
                }
            ]
        };
        // Setup mocks
        const mockConnection = {
            openBox: jest.fn().mockResolvedValue({}),
            search: jest.fn().mockResolvedValue([mockEmail]),
            end: jest.fn().mockResolvedValue(undefined),
            addFlags: jest.fn().mockResolvedValue(undefined)
        };
        imaps.connect.mockResolvedValue(mockConnection);
        simpleParser.mockResolvedValue(mockParsedEmail);
        // Call the function
        const result = await ingestScheduledReport('VinSolutions', './downloads');
        // Check results
        expect(result).toMatch(/^\.\/downloads\/VinSolutions_\d+_report\.csv$/);
        expect(fs.promises.writeFile).toHaveBeenCalledWith(expect.stringContaining('report.csv'), attachmentContent);
        expect(mockConnection.addFlags).toHaveBeenCalledWith('123', 'Seen');
    });
    test('should process only the first attachment when multiple are found', async () => {
        // Create mock email data with multiple attachments
        const attachmentContent1 = Buffer.from('test,data1\n1,2');
        const attachmentContent2 = Buffer.from('test,data2\n3,4');
        const mockEmail = {
            attributes: { uid: '123' },
            parts: [
                { which: '', body: 'raw email body' }
            ]
        };
        // Mock parsed email with multiple attachments
        const mockParsedEmail = {
            subject: 'Test Report',
            attachments: [
                {
                    filename: 'report1.csv',
                    content: attachmentContent1
                },
                {
                    filename: 'report2.csv',
                    content: attachmentContent2
                }
            ]
        };
        // Setup mocks
        const mockConnection = {
            openBox: jest.fn().mockResolvedValue({}),
            search: jest.fn().mockResolvedValue([mockEmail]),
            end: jest.fn().mockResolvedValue(undefined),
            addFlags: jest.fn().mockResolvedValue(undefined)
        };
        imaps.connect.mockResolvedValue(mockConnection);
        simpleParser.mockResolvedValue(mockParsedEmail);
        // Call the function
        const result = await ingestScheduledReport('VinSolutions', './downloads');
        // Check results - should only process the first attachment
        expect(result).toMatch(/^\.\/downloads\/VinSolutions_\d+_report1\.csv$/);
        expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
        expect(fs.promises.writeFile).toHaveBeenCalledWith(expect.stringContaining('report1.csv'), attachmentContent1);
    });
    test('should throw error when email found but no attachments', async () => {
        // Create mock email data without attachments
        const mockEmail = {
            attributes: { uid: '123' },
            parts: [
                { which: '', body: 'raw email body' }
            ]
        };
        // Mock parsed email without attachments
        const mockParsedEmail = {
            subject: 'Test Report',
            attachments: [] // No attachments
        };
        // Setup mocks
        const mockConnection = {
            openBox: jest.fn().mockResolvedValue({}),
            search: jest.fn().mockResolvedValue([mockEmail]),
            end: jest.fn().mockResolvedValue(undefined),
            addFlags: jest.fn().mockResolvedValue(undefined)
        };
        imaps.connect.mockResolvedValue(mockConnection);
        simpleParser.mockResolvedValue(mockParsedEmail);
        // Call the function and expect it to throw
        await expect(ingestScheduledReport('VinSolutions', './downloads'))
            .rejects.toThrow(ReportNotFoundError);
    });
    test('should handle IMAP connection errors properly', async () => {
        // Setup mocks to throw connection error
        imaps.connect.mockRejectedValue(new Error('Connection failed'));
        // Call the function and expect it to throw
        await expect(ingestScheduledReport('VinSolutions', './downloads'))
            .rejects.toThrow('Failed to process emails: Connection failed');
    });
    test('should throw error when required environment variables are missing', async () => {
        // Remove required environment variables
        delete process.env.EMAIL_USER;
        // Call the function and expect it to throw
        await expect(ingestScheduledReport('VinSolutions', './downloads'))
            .rejects.toThrow('Missing required email configuration');
    });
});
//# sourceMappingURL=ingestScheduledReport.test.js.map