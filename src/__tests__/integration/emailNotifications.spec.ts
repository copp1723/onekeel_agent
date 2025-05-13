import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../shared/db.js';
import { workflows, emailNotifications, emailLogs } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { configureWorkflowNotifications, sendWorkflowCompletionEmail } from '../../services/workflowEmailService.js';
import { emailQueue } from '../../services/emailQueue.js';

// Mock dependencies
vi.mock('../../services/mailerService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  generateWorkflowSummaryHtml: vi.fn().mockReturnValue('<p>Test email content</p>')
}));

vi.mock('../../services/emailQueue.js', () => ({
  emailQueue: {
    enqueue: vi.fn().mockResolvedValue('test-queue-id')
  }
}));

describe('Email Notifications Integration Tests', () => {
  // Test data
  const testWorkflowId = uuidv4();
  const testUserId = 'test-user-id';
  const testEmail = 'test@example.com';
  
  // Set up test workflow
  beforeAll(async () => {
    // Create a test workflow
    await db.insert(workflows).values({
      id: testWorkflowId,
      name: 'Test Workflow',
      description: 'A test workflow for email notification testing',
      userId: testUserId,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  // Clean up test data after tests
  afterAll(async () => {
    await db.delete(emailLogs).where(eq(emailLogs.workflowId, testWorkflowId));
    await db.delete(emailNotifications).where(eq(emailNotifications.workflowId, testWorkflowId));
    await db.delete(workflows).where(eq(workflows.id, testWorkflowId));
  });

  describe('Email Notification Configuration', () => {
    it('should configure email notifications for a workflow', async () => {
      const config = {
        recipientEmail: testEmail,
        sendOnCompletion: true,
        sendOnFailure: true
      };
      
      const result = await configureWorkflowNotifications(testWorkflowId, config);
      
      // Check that the notification was configured
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.workflowId).toBe(testWorkflowId);
      expect(result.recipientEmail).toBe(testEmail);
      expect(result.sendOnCompletion).toBe(true);
      expect(result.sendOnFailure).toBe(true);
      
      // Check that the notification was saved to the database
      const [notification] = await db
        .select()
        .from(emailNotifications)
        .where(eq(emailNotifications.workflowId, testWorkflowId));
      
      expect(notification).toBeDefined();
      expect(notification.workflowId).toBe(testWorkflowId);
      expect(notification.recipientEmail).toBe(testEmail);
      expect(notification.sendOnCompletion).toBe(true);
      expect(notification.sendOnFailure).toBe(true);
    });
  });

  describe('Email Sending', () => {
    it('should send a workflow completion email', async () => {
      const result = await sendWorkflowCompletionEmail(testWorkflowId, testEmail);
      
      // Check that the email was sent
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.workflowId).toBe(testWorkflowId);
      expect(result.recipientEmail).toBe(testEmail);
      expect(result.status).toBe('sent');
      
      // Check that the email was logged in the database
      const [log] = await db
        .select()
        .from(emailLogs)
        .where(eq(emailLogs.workflowId, testWorkflowId));
      
      expect(log).toBeDefined();
      expect(log.workflowId).toBe(testWorkflowId);
      expect(log.recipientEmail).toBe(testEmail);
      expect(log.status).toBe('sent');
      
      // Check that the email was queued
      expect(emailQueue.enqueue).toHaveBeenCalled();
    });

    it('should handle email sending failures gracefully', async () => {
      // Mock the email queue to simulate a failure
      vi.mocked(emailQueue.enqueue).mockRejectedValueOnce(new Error('Failed to send email'));
      
      try {
        await sendWorkflowCompletionEmail(testWorkflowId, 'invalid-email');
        // If we reach here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        // Check that the error was handled properly
        expect(error).toBeDefined();
        expect(error.message).toBe('Failed to send email');
        
        // Check that the failure was logged in the database
        const logs = await db
          .select()
          .from(emailLogs)
          .where(eq(emailLogs.workflowId, testWorkflowId))
          .where(eq(emailLogs.status, 'failed'));
        
        expect(logs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Email Notification Workflow', () => {
    it('should send notifications based on workflow status', async () => {
      // Create a new workflow for this test
      const newWorkflowId = uuidv4();
      
      await db.insert(workflows).values({
        id: newWorkflowId,
        name: 'New Test Workflow',
        description: 'A new test workflow for email notification testing',
        userId: testUserId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Configure notifications
      await configureWorkflowNotifications(newWorkflowId, {
        recipientEmail: testEmail,
        sendOnCompletion: true,
        sendOnFailure: true
      });
      
      // Update workflow status to completed
      await db
        .update(workflows)
        .set({ status: 'completed' })
        .where(eq(workflows.id, newWorkflowId));
      
      // Simulate the notification trigger
      await sendWorkflowCompletionEmail(newWorkflowId, testEmail);
      
      // Check that the email was logged
      const [log] = await db
        .select()
        .from(emailLogs)
        .where(eq(emailLogs.workflowId, newWorkflowId));
      
      expect(log).toBeDefined();
      expect(log.workflowId).toBe(newWorkflowId);
      expect(log.recipientEmail).toBe(testEmail);
      expect(log.status).toBe('sent');
      
      // Clean up
      await db.delete(emailLogs).where(eq(emailLogs.workflowId, newWorkflowId));
      await db.delete(emailNotifications).where(eq(emailNotifications.workflowId, newWorkflowId));
      await db.delete(workflows).where(eq(workflows.id, newWorkflowId));
    });
  });
});
