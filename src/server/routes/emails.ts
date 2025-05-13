/**
 * Email Notification API Routes
 * Handles email notification configuration and management
 */

import { Router } from 'express';
import { Response } from 'express';
import {
  sendWorkflowEmail,
  getEmailLogs,
  retryEmail,
  configureNotification,
  getNotificationSettings,
  deleteNotification
} from '../../services/workflowEmailService.js';
import { routeHandler, AuthenticatedRequest } from '../../utils/routeHandler.js';

const router = Router();

/**
 * Configure email notifications for a workflow
 * POST /api/emails/notifications/:workflowId
 */
router.post('/notifications/:workflowId', routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { workflowId } = req.params;
  const { recipientEmail, sendOnCompletion, sendOnFailure } = req.body;

  const result = await configureNotification(workflowId, {
    recipientEmail,
    sendOnCompletion,
    sendOnFailure
  });

  return res.json(result);
}));

/**
 * Get email notification settings for a workflow
 * GET /api/emails/notifications/:workflowId
 */
router.get('/notifications/:workflowId', routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { workflowId } = req.params;
  const settings = await getNotificationSettings(workflowId);
  return res.json(settings);
}));

/**
 * Delete notification settings for a workflow
 * DELETE /api/emails/notifications/:workflowId
 */
router.delete('/notifications/:workflowId', routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { workflowId } = req.params;
  const result = await deleteNotification(workflowId);
  return res.json(result);
}));

/**
 * Get email logs for a workflow
 * GET /api/emails/logs/:workflowId
 */
router.get('/logs/:workflowId', routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { workflowId } = req.params;
  const logs = await getEmailLogs(workflowId);
  return res.json(logs);
}));

/**
 * Retry sending a failed email
 * POST /api/emails/retry/:emailLogId
 */
router.post('/retry/:emailLogId', routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { emailLogId } = req.params;
  const result = await retryEmail(emailLogId);
  return res.json(result);
}));

export default router;