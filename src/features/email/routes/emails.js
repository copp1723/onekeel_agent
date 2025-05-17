/**
 * Email Notification API Routes
 * Handles email notification configuration and management
 */

import express from 'express';
import { sendWorkflowCompletionEmail, sendWorkflowSummaryEmail } from '../../../../../services/workflowEmailService.js';
import { db } from '../../../../../shared/db.js';
import { emailNotifications, emailLogs } from '../../../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { getWorkflow } from '../../../../../services/workflowService.js';

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
    
    // Verify workflow exists
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ 
        success: false, 
        message: `Workflow ${workflowId} not found` 
      });
    }
    
    // Check if notification already exists
    const [existing] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));
    
    let result;
    if (existing) {
      // Update existing notification
      const [updated] = await db
        .update(emailNotifications)
        .set({
          recipientEmail,
          sendOnCompletion: sendOnCompletion !== undefined ? sendOnCompletion : true,
          sendOnFailure: sendOnFailure !== undefined ? sendOnFailure : true,
          updatedAt: new Date()
        })
        .where(eq(emailNotifications.id, existing.id))
        .returning();
      
      result = {
        success: true,
        notification: updated,
        message: 'Email notification updated'
      };
    } else {
      // Create new notification
      const [created] = await db
        .insert(emailNotifications)
        .values({
          workflowId,
          recipientEmail,
          sendOnCompletion: sendOnCompletion !== undefined ? sendOnCompletion : true,
          sendOnFailure: sendOnFailure !== undefined ? sendOnFailure : true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      result = {
        success: true,
        notification: created,
        message: 'Email notification created'
      };
    }
    
    res.json({
      success: true,
      message: 'Email notifications configured',
      notification: result.notification
    });
  } catch (error) {
    console.error('Error configuring email notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to configure email notifications',
      error: error.message
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
    
    // Verify workflow exists
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ 
        success: false, 
        message: `Workflow ${workflowId} not found` 
      });
    }
    
    const [notification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'No email notification settings found for this workflow'
      });
    }
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error getting email notification settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get email notification settings',
      error: error.message
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
    
    // Verify workflow exists
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ 
        success: false, 
        message: `Workflow ${workflowId} not found` 
      });
    }
    
    await db
      .delete(emailNotifications)
      .where(eq(emailNotifications.workflowId, workflowId));
    
    res.json({
      success: true,
      message: 'Email notification settings deleted'
    });
  } catch (error) {
    console.error('Error deleting email notification settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete email notification settings',
      error: error.message
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
    
    // Verify workflow exists
    const workflow = await getWorkflow(workflowId);
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
      message: 'Failed to get email logs',
      error: error.message
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
    
    res.json(result);
  } catch (error) {
    console.error('Error retrying failed email:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retry failed email',
      error: error.message
    });
  }
});

export default router;