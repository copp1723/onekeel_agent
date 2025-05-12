/**
 * Email Notification API Routes
 * Manages email notification settings and email logs
 */
import express from 'express';
import { 
  configureEmailNotifications, 
  getEmailNotificationSettings, 
  deleteEmailNotificationSettings, 
  getEmailLogs, 
  retryFailedEmail 
} from '../../services/fixed-workflowEmailService.js';

// Create router
const router = express.Router();

/**
 * Configure email notification settings
 * POST /api/emails/notifications
 */
router.post('/notifications', async (req, res) => {
  try {
    const settings = req.body;
    
    if (!settings) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email notification settings are required' 
      });
    }
    
    const result = await configureEmailNotifications(settings);
    
    return res.json({ 
      success: true, 
      message: 'Email notification settings configured', 
      data: result 
    });
  } catch (error) {
    console.error('Error configuring email notifications:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to configure email notifications', 
      error: error.message 
    });
  }
});

/**
 * Get email notification settings
 * GET /api/emails/notifications
 * Query parameters:
 * - id: Notification settings ID
 * - workflowType: Workflow type
 * - platform: Platform
 */
router.get('/notifications', async (req, res) => {
  try {
    const filters = {
      id: req.query.id,
      workflowType: req.query.workflowType,
      platform: req.query.platform
    };
    
    const result = await getEmailNotificationSettings(filters);
    
    return res.json({ 
      success: true, 
      message: 'Email notification settings retrieved', 
      data: result 
    });
  } catch (error) {
    console.error('Error getting email notifications:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get email notifications', 
      error: error.message 
    });
  }
});

/**
 * Delete email notification settings
 * DELETE /api/emails/notifications/:id
 */
router.delete('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Notification ID is required' 
      });
    }
    
    const result = await deleteEmailNotificationSettings(id);
    
    if (result) {
      return res.json({ 
        success: true, 
        message: `Email notification settings ${id} deleted` 
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        message: `Email notification settings ${id} not found` 
      });
    }
  } catch (error) {
    console.error('Error deleting email notifications:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete email notifications', 
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
    
    if (!workflowId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Workflow ID is required' 
      });
    }
    
    const logs = await getEmailLogs(workflowId);
    
    return res.json({ 
      success: true, 
      message: `Retrieved ${logs.length} email logs for workflow ${workflowId}`, 
      data: logs 
    });
  } catch (error) {
    console.error('Error retrieving email logs:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve email logs', 
      error: error.message 
    });
  }
});

/**
 * Retry a failed email
 * POST /api/emails/retry/:emailLogId
 */
router.post('/retry/:emailLogId', async (req, res) => {
  try {
    const { emailLogId } = req.params;
    
    if (!emailLogId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email log ID is required' 
      });
    }
    
    const result = await retryFailedEmail(emailLogId);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: `Email ${emailLogId} retried successfully`, 
        data: result 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: `Failed to retry email: ${result.message}`, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error retrying email:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retry email', 
      error: error.message 
    });
  }
});

export default router;