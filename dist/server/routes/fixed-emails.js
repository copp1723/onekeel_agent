/**
 * Email Notification Fixed API Routes
 * Handles email notification configuration and management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../shared/db.js';
import { workflows, emailNotifications, emailLogs } from '../../shared/schema.js';
import { configureEmailNotifications, getEmailNotificationSettings, deleteEmailNotificationSettings, sendWorkflowCompletionEmail } from '../../services/fixed-workflowEmailService.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * Configure email notifications for a workflow
 * POST /api/emails/notifications/:workflowId
 */
router.post('/notifications/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { recipientEmail, sendOnCompletion, sendOnFailure } = req.body;
    
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }
    
    // Check if workflow exists
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: `Workflow ${workflowId} not found`
      });
    }
    
    const result = await configureEmailNotifications({
      workflowId,
      recipientEmail,
      sendOnCompletion: sendOnCompletion !== false, // Default to true
      sendOnFailure: sendOnFailure !== false // Default to true
    });
    
    res.json({
      success: true,
      notification: result
    });
  } catch (error) {
    console.error('Error configuring email notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get email notification settings for a workflow
 * GET /api/emails/notifications/:workflowId
 */
router.get('/notifications/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // Check if workflow exists
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      return res.status(404).json({
        success: false, 
        message: `Workflow ${workflowId} not found` 
      });
    }
    
    const settings = await getEmailNotificationSettings(workflowId);
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error getting email notification settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Delete email notification settings for a workflow
 * DELETE /api/emails/notifications/:workflowId
 */
router.delete('/notifications/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // Check if workflow exists
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      return res.status(404).json({
        success: false, 
        message: `Workflow ${workflowId} not found` 
      });
    }
    
    const result = await deleteEmailNotificationSettings(workflowId);
    
    if (result) {
      res.json({
        success: true,
        message: 'Email notification settings deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No email notification settings found for this workflow'
      });
    }
  } catch (error) {
    console.error('Error deleting email notification settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get email logs for a workflow
 * GET /api/emails/logs/:workflowId
 */
router.get('/logs/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // Check if workflow exists
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      return res.status(404).json({
        success: false, 
        message: `Workflow ${workflowId} not found` 
      });
    }
    
    const logs = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.workflowId, workflowId))
      .orderBy(emailLogs.createdAt);
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error getting email logs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Retry sending a failed email
 * POST /api/emails/retry/:emailLogId
 */
router.post('/retry/:emailLogId', async (req, res) => {
  try {
    const { emailLogId } = req.params;
    
    // Get the email log
    const [emailLog] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, emailLogId));
    
    if (!emailLog) {
      return res.status(404).json({
        success: false,
        message: `Email log ${emailLogId} not found`
      });
    }
    
    if (emailLog.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: `Email is not in failed state (current: ${emailLog.status})`
      });
    }
    
    // Get workflow details
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, emailLog.workflowId));
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: `Workflow ${emailLog.workflowId} not found`
      });
    }
    
    // Send the email
    const result = await sendWorkflowCompletionEmail(
      workflow.id,
      emailLog.recipientEmail
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Update the log entry
    await db
      .update(emailLogs)
      .set({
        status: 'sent',
        sentAt: new Date(),
        attempts: (emailLog.attempts || 0) + 1,
        updatedAt: new Date(),
        errorMessage: null
      })
      .where(eq(emailLogs.id, emailLogId));
    
    res.json({
      success: true,
      message: 'Email resent successfully',
      result
    });
  } catch (error) {
    console.error('Error retrying failed email:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send a test email
 * POST /api/emails/test
 * Body: { recipientEmail, workflowId? }
 */
router.post('/test', async (req, res) => {
  try {
    const { recipientEmail, workflowId } = req.body;
    
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }
    
    let workflow;
    
    if (workflowId) {
      // Use an existing workflow if provided
      [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId));
      
      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: `Workflow ${workflowId} not found`
        });
      }
    } else {
      // Create a test workflow
      const testWorkflowId = uuidv4();
      [workflow] = await db
        .insert(workflows)
        .values({
          id: testWorkflowId,
          name: 'Test Email Workflow',
          status: 'completed',
          currentStep: 1,
          context: {
            startedBy: 'email-test',
            timestamp: new Date().toISOString(),
            insights: [
              'Sample test insight 1',
              'Sample test insight 2',
              'Sample test insight 3'
            ],
            summary: 'This is a test email from the workflow system'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUpdated: new Date()
        })
        .returning();
    }
    
    // Send the email
    const result = await sendWorkflowCompletionEmail(
      workflow.id,
      recipientEmail
    );
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Test email sent to ${recipientEmail}` 
        : `Failed to send test email: ${result.error}`,
      ...result
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;