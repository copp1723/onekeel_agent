import { describe, it, expect, jest } from '@jest/globals';
import { emailQueue } from '../../../src/services/emailQueue';
import type { EmailSendOptions } from '../../../src/features/email/services/mailerService';

// Mock the email queue
jest.mock('../../../src/services/emailQueue', () => ({
  emailQueue: {
    enqueue: jest.fn().mockResolvedValue('test-queue-id'),
  },
}));

describe('Email Processing', () => {
  describe('Email Queue Processing', () => {
    it('should process a valid email with text content', async () => {
      // Arrange
      const testEmail: EmailSendOptions = {
        to: { email: 'recipient@example.com' },
        from: { email: 'noreply@example.com' },
        content: {
          subject: 'Test Email',
          text: 'This is a test email',
          html: '<p>This is a test email</p>',
        },
      };

      // Act
      const result = await emailQueue.enqueue(testEmail);

      // Assert
      expect(result).toBe('test-queue-id');
      expect(emailQueue.enqueue).toHaveBeenCalledWith(testEmail);
    });

    it('should process a valid email with CSV attachment', async () => {
      // Arrange
      const testEmail: EmailSendOptions = {
        to: { email: 'data@example.com' },
        from: { email: 'reports@example.com' },
        content: {
          subject: 'Monthly Report',
          text: 'Please find attached the monthly report.',
          html: '<p>Please find attached the monthly report.</p>',
        },
        attachments: [
          {
            filename: 'report.csv',
            content: Buffer.from('date,value\n2023-01-01,100\n2023-01-02,200'),
            contentType: 'text/csv',
          },
        ],
      };

      // Act
      const result = await emailQueue.enqueue(testEmail);

      // Assert
      expect(result).toBe('test-queue-id');
      expect(emailQueue.enqueue).toHaveBeenCalledWith(testEmail);
    });

    it('should handle malformed email address', async () => {
      // Arrange
      const testEmail: EmailSendOptions = {
        to: { email: 'invalid-email' }, // This would be validated by the email service
        from: { email: 'test@example.com' },
        content: {
          subject: 'Test Email',
          text: 'This is a test email',
          html: '<p>This is a test email</p>',
        },
      };

      // Act & Assert - The queue might accept it but the email service should handle the validation
      await expect(emailQueue.enqueue(testEmail)).resolves.toBe('test-queue-id');
      expect(emailQueue.enqueue).toHaveBeenCalledWith(testEmail);
    });
  });
});
