/**
 * Email Notification API Routes
 * Handles email notification configuration and management
 */

import express, { Request, Response } from 'express';
import { 
  configureEmailNotifications,
  getEmailNotificationSettings,
  deleteEmailNotificationSettings,
  getEmailLogs,
  retryFailedEmail
} from '../../services/workflowEmailService.js';
import { getWorkflow } from '../../services/workflowService.js';

const router = express.Router();

/**
 * Configure email notifications for a workflow
 * POST /api/emails/notifications/:workflowId
 */
router.post('/notifications/:workflowId', async (req: Request, res: Response) => {
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
    
    const result = await configureEmailNotifications(
      workflowId, 
      recipientEmail, 
      {
        sendOnCompletion,
        sendOnFailure
      }
    );
    
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
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get email notification settings for a workflow
 * GET /api/emails/notifications/:workflowId
 */
router.get('/notifications/:workflowId', async (req: Request, res: Response) => {
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
    
    const notification = await getEmailNotificationSettings(workflowId);
    
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
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete email notification settings for a workflow
 * DELETE /api/emails/notifications/:workflowId
 */
router.delete('/notifications/:workflowId', async (req: Request, res: Response) => {
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
    
    await deleteEmailNotificationSettings(workflowId);
    
    res.json({
      success: true,
      message: 'Email notification settings deleted'
    });
  } catch (error) {
    console.error('Error deleting email notification settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete email notification settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get email logs for a workflow
 * GET /api/emails/logs/:workflowId
 */
router.get('/logs/:workflowId', async (req: Request, res: Response) => {
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
    
    const logs = await getEmailLogs(workflowId);
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error getting email logs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get email logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Retry sending a failed email
 * POST /api/emails/retry/:emailLogId
 */
router.post('/retry/:emailLogId', async (req: Request, res: Response) => {
  try {
    const { emailLogId } = req.params;
    
    const result = await retryFailedEmail(emailLogId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error retrying failed email:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retry failed email',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;