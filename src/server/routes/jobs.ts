
/**
 * API Routes for Job Management
 */
import { Router, Request, Response } from 'express';
import {
  listJobs,
  getJobById,
  retryJob,
  enqueueJob
} from '../../services/jobQueue.js';
import { isAuthenticated } from '../replitAuth.js';
import { db } from '../../shared/db.js';
import { taskLogs } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { routeHandler, AuthenticatedRequest } from '../../utils/routeHandler.js';

const router = Router();

// Get all jobs with optional filtering by status
router.get('/', isAuthenticated, routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, limit } = req.query;
  const jobs = await listJobs(
    status as string | undefined,
    limit ? parseInt(limit as string) : 100
  );

  return res.json({ jobs });
}));

// Get a specific job by ID
router.get('/:id', isAuthenticated, routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const job = await getJobById(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Get associated task information
  const taskData = await db
    .select()
    .from(taskLogs)
    .where(eq(taskLogs.id, job.taskId || ''));

  const task = taskData.length > 0 ? taskData[0] : null;

  return res.json({
    job,
    task
  });
}));

// Manually retry a failed job
router.post('/:id/retry', isAuthenticated, routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const success = await retryJob(id);

  if (!success) {
    return res.status(400).json({ error: 'Failed to retry job' });
  }

  return res.json({
    message: 'Job retry initiated',
    jobId: id
  });
}));

// Manually enqueue a new job for a task
router.post('/enqueue/:taskId', isAuthenticated, routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { taskId } = req.params;
  const { priority } = req.body;

  // Verify task exists
  const taskData = await db
    .select()
    .from(taskLogs)
    .where(eq(taskLogs.id, taskId));

  if (taskData.length === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const jobId = await enqueueJob(taskId, priority || 1);

  return res.json({
    message: 'Job enqueued successfully',
    jobId
  });
}));

export default router;
