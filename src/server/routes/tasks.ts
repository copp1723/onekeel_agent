/**
 * Task Routes
 * Handles API routes for task operations
 */
import express, { Request, Response } from 'express';
import { isAuthenticated } from '../replitAuth.js';
import { db } from '../../shared/db.js';
import { taskLogs, apiKeys } from '../../shared/schema.js';
import { enqueueJob } from '../../services/jobQueue.js';
import parseTask from '../../services/taskParser.js';
import { getApiKeyById } from '../../services/apiKeyService.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../../shared/logger.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

/**
 * Get all tasks for the authenticated user
 */
router.get('/', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const tasks = await db
      .select()
      .from(taskLogs)
      .where(eq(taskLogs.userId!, userId))
      .orderBy(taskLogs.createdAt!);
    
    res.json(tasks);
  } catch (error) {
    logger.error('Error getting tasks:', error);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

/**
 * Get a specific task by ID
 */
router.get('/:id', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const taskId = req.params.id;
    
    const [task] = await db
      .select()
      .from(taskLogs)
      .where(eq(taskLogs.id, taskId))
      .where(eq(taskLogs.userId!, userId));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    logger.error('Error getting task:', error);
    res.status(500).json({ error: 'Failed to retrieve task' });
  }
});

/**
 * Create a new task
 */
router.post('/', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { taskType, taskText, platform, apiKeyId } = req.body;
    
    // Validate required fields
    if (!taskType || !taskText) {
      return res.status(400).json({ error: 'Task type and text are required' });
    }
    
    // Get API key if provided
    let apiKeyData = null;
    if (apiKeyId) {
      try {
        apiKeyData = await getApiKeyById(apiKeyId, userId);
        if (!apiKeyData) {
          return res.status(400).json({ error: 'Invalid API key' });
        }
      } catch (error) {
        logger.error('Error retrieving API key:', error);
        return res.status(400).json({ error: 'Failed to retrieve API key' });
      }
    }
    
    // Parse the task
    const parsedTask = await parseTask(taskText);
    
    // Add platform and API key info to task parameters
    const taskParameters = {
      ...parsedTask.parameters,
      platform,
      apiKey: apiKeyData ? {
        service: apiKeyData.service,
        keyValue: apiKeyData.keyValue,
        // Include any additional data needed for the API
        ...(apiKeyData.additionalData || {})
      } : undefined
    };
    
    // Generate task ID
    const taskId = crypto.randomUUID();
    
    // Create the task object and insert into database
    await db.insert(taskLogs).values({
      id: taskId,
      userId,
      taskType,
      taskText,
      taskData: taskParameters,
      status: 'pending',
      createdAt: new Date(),
    });
    
    // Enqueue the task for processing
    const jobId = await enqueueJob(taskId);
    
    logger.info(`Task ${taskId} created with API key: ${apiKeyId ? 'Yes' : 'No'}`);
    
    // Return the created task
    res.status(201).json({
      id: taskId,
      jobId,
      message: 'Task created and enqueued successfully',
    });
  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

export default router;
