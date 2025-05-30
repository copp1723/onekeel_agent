// src/api/server.ts
import * as express from 'express';
import { Request, Response } from 'express';
import { routeHandler, AuthenticatedRequest } from '../utils/routeHandler.js';
import { getTaskLogs } from '../shared/logger.js';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { registerAuthRoutes } from '../server/routes/index.js';
import { TaskParser } from '../services/taskParser.js';
import { initializeJobQueue } from '../services/jobQueue.js';
import { initializeScheduler } from '../services/schedulerService.js';
import { initializeMailer } from '../services/mailerService.js';
import jobsRouter from '../server/routes/jobs.js';
import workflowsRouter from '../server/routes/workflows.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Configure and register authentication routes
(async () => {
  try {
    // Initialize job queue service
    await initializeJobQueue();
    console.log('Job queue initialized');

    // Initialize the task scheduler
    await initializeScheduler();
    console.log('Task scheduler initialized');

    // Initialize email service if SendGrid API key is available
    if (process.env.SENDGRID_API_KEY) {
      initializeMailer();
    } else {
      console.warn('SendGrid API key not found; email functionality will be limited');
    }

    // Register authentication and API routes
    await registerAuthRoutes(app);
    console.log('Authentication routes registered successfully');

    // Register job management routes
    app.use('/api/jobs', jobsRouter);

    // Register workflow routes
    app.use('/api/workflows', workflowsRouter);
    console.log('Job management and workflow routes registered');
  } catch (error) {
    console.error('Failed to register routes:', error);
  }
})();

// Set up routes
const router = express.Router();

// Health check
router.get(
  '/health',
  routeHandler(async (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      status: 'up',
      version: '1.0.0',
      message: 'API server is running'
    });
  })
);

// Test-parser endpoint
router.post(
  '/test-parser',
  routeHandler(async (req: AuthenticatedRequest, res: Response) => {
    const task = req.body.task || '';
    // Pass the EKO_API_KEY from environment variables or a default empty string
    const ekoApiKey = process.env.EKO_API_KEY || '';
    const parser = new TaskParser(ekoApiKey);
    const result = await parser.parseUserRequest(task);
    res.json(result);
  })
);

// Tasks listing endpoint
router.get(
  '/tasks',
  routeHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const tasks = await getTaskLogs("all");
    res.json(tasks);
  })
);

// Register API routes
app.use('/api', router);

// Serve the index.html file for the root route
app.get('/', routeHandler(async (_req: AuthenticatedRequest, res: Response) => {
  res.sendFile('index.html', { root: './public' });
}));

// Import job queue and database dependencies
import { enqueueJob } from '../services/jobQueue.js';
import { db } from '../shared/db.js';
import { taskLogs } from '../shared/schema.js';

// API endpoint to submit a new task
app.post('/api/tasks', routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { task } = req.body;

  if (!task || typeof task !== 'string') {
    return res.status(400).json({ error: 'Task is required and must be a string' });
  }

  // Parse the task to determine its type and parameters
  const parser = new TaskParser();
  const result = await parser.parseUserRequest(task);
  const parsedTask = result.task;

  // Generate task ID
  const taskId = crypto.randomUUID();

  // Create the task object and insert into database
  await db.insert(taskLogs).values({
    id: taskId,
    userId: req.user?.claims?.sub,
    taskType: parsedTask.type,
    taskText: task,
    taskData: parsedTask.parameters,
    status: 'pending'
  });

  // Enqueue the task for processing with job queue
  const jobId = await enqueueJob(taskId);

  console.log(`Task ${taskId} submitted and enqueued as job ${jobId}`);

  // Return the task ID
  return res.status(201).json({
    id: taskId,
    jobId: jobId,
    message: 'Task submitted and enqueued successfully'
  });
}));

// API endpoint for direct task execution
app.post('/submit-task', routeHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { task } = req.body;

  if (!task || typeof task !== 'string') {
    return res.status(400).json({ error: 'Task is required and must be a string' });
  }

  // Parse the task to determine its type and parameters
  const parser = new TaskParser();
  const result = await parser.parseUserRequest(task);
  const parsedTask = result.task;

  // Generate task ID
  const taskId = crypto.randomUUID();

  // Create the task object and insert into database
  await db.insert(taskLogs).values({
    id: taskId,
    userId: req.user?.claims?.sub,
    taskType: parsedTask.type,
    taskText: task,
    taskData: parsedTask.parameters,
    status: 'pending'
  });

  // Enqueue the task with high priority (1 is highest)
  const jobId = await enqueueJob(taskId, 1);

  console.log(`Direct task ${taskId} submitted and enqueued as job ${jobId}`);

  // Return the task ID
  return res.status(201).json({
    id: taskId,
    jobId: jobId,
    message: 'Task submitted for immediate processing'
  });
}));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AI Agent API server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET / - Web UI for task submission and result viewing`);
  console.log(`  POST /api/tasks - Submit a new task`);
  console.log(`  GET /api/tasks/:taskId - Get task status`);
  console.log(`  GET /api/tasks - List all tasks`);
  console.log(`  POST /submit-task - Execute tasks directly`);
  console.log(`  GET /api/health - Health check endpoint`);
});

// Export the app for testing
export { app };