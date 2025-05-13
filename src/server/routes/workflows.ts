/**
 * Workflow Routes
 * Handles API routes for workflow operations
 */
import express from 'express';
import {
  getWorkflow,
  getWorkflows,
  resetWorkflow,
  configureWorkflowNotifications
} from '../../services/workflowService.js';
import { isAuthenticated } from '../replitAuth.js';
import { routeHandler, AuthenticatedRequest } from '../../utils/routeHandler.js';

const router = express.Router();

/**
 * Get all workflows (or filter by status)
 */
router.get('/', isAuthenticated, routeHandler(async (req: AuthenticatedRequest, res) => {
  const status = req.query.status as string | undefined;
  // Access user ID from the user object (if available)
  const userId = req.user?.claims?.sub || null;

  const workflows = await getWorkflows(status, userId);
  res.json(workflows);
}));

/**
 * Get a workflow by ID
 */
router.get('/:id', isAuthenticated, routeHandler(async (req: AuthenticatedRequest, res) => {
  const workflowId = req.params.id;
  const workflow = await getWorkflow(workflowId);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const userId = req.user?.claims?.sub || null;

  // If userId is provided and doesn't match, deny access
  if (userId && workflow.userId && workflow.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.json(workflow);
}));

/**
 * Reset a workflow to pending status
 */
router.post('/:id/reset', isAuthenticated, routeHandler(async (req: AuthenticatedRequest, res) => {
  const workflowId = req.params.id;
  const workflow = await getWorkflow(workflowId);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const userId = req.user?.claims?.sub || null;

  // If userId is provided and doesn't match, deny access
  if (userId && workflow.userId && workflow.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const resetResult = await resetWorkflow(workflowId);
  return res.json(resetResult);
}));

/**
 * Configure email notifications for a workflow
 */
router.post('/:id/notifications', isAuthenticated, routeHandler(async (req: AuthenticatedRequest, res) => {
  const { emails } = req.body;

  if (!emails) {
    return res.status(400).json({ error: 'Email addresses are required' });
  }

  const workflowId = req.params.id;
  const workflow = await getWorkflow(workflowId);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const userId = req.user?.claims?.sub || null;

  // If userId is provided and doesn't match, deny access
  if (userId && workflow.userId && workflow.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Configure notifications for the workflow
  const updatedWorkflow = await configureWorkflowNotifications(workflowId, emails);
  return res.json(updatedWorkflow);
}));

export default router;