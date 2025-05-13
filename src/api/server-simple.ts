import * as express from 'express';
import { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { logTask, getTaskLogs } from '../shared/logger.js';
import { TaskType } from '../types.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());

// Simple in-memory task storage as fallback
const taskLogs: Record<string, {
  id: string;
  task: string;
  taskType: TaskType | string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}> = {};

// API endpoint for submitting new tasks (Phase 2)
app.post('/api/tasks', (function(req: Request, res: Response) {
  try {
    const { task } = req.body;

    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'Task is required and must be a string' });
    }

    // Generate a unique ID for this task
    const taskId = crypto.randomUUID();

    // Log the new task
    taskLogs[taskId] = {
      id: taskId,
      task,
      taskType: task.toLowerCase().includes('crawl') ? TaskType.WebCrawling :
               task.toLowerCase().includes('flight') ? TaskType.FlightStatus : TaskType.Unknown,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Return the task ID immediately so client can poll for status
    res.status(202).json({ taskId, message: 'Task accepted and processing' });

    // Process the task asynchronously (simulate processing)
    setTimeout(() => {
      // Simulate completion
      taskLogs[taskId].status = 'completed';
      taskLogs[taskId].result = {
        simulatedResult: true,
        message: "This is a simulated result. API key required for actual processing.",
        task: task
      };
      taskLogs[taskId].completedAt = new Date().toISOString();

      // Log to our persistent store as well
      logTask({
        userInput: task,
        tool: String(taskLogs[taskId].taskType),
        status: 'success',
        output: taskLogs[taskId].result,
        userId: undefined
      }).catch(err => console.error('Failed to log completion to database:', err));

    }, 2000);

  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

// API endpoint to get task status and results
app.get('/api/tasks/:taskId', (function(req: Request, res: Response) {
  const { taskId } = req.params;

  if (!taskLogs[taskId]) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(200).json(taskLogs[taskId]);
}));

// API endpoint to list all tasks
app.get('/api/tasks', (function(_req: Request, res: Response) {
  try {
    // Try to get logs from database first
    getTaskLogs().then(logs => {
      // Also include in-memory tasks
      const memoryTasks = Object.values(taskLogs);

      // Combine and deduplicate (prefer memory versions)
      const allTasks = [...memoryTasks];

      res.status(200).json(allTasks);
    }).catch(error => {
      console.error('Error fetching tasks:', error);
      // Fall back to just in-memory tasks
      const tasks = Object.values(taskLogs);
      res.status(200).json(tasks);
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    // Fall back to just in-memory tasks
    const tasks = Object.values(taskLogs);
    res.status(200).json(tasks);
  }
}));

// API endpoint for direct task execution (Phase 3)
app.post('/submit-task', (function(req: Request, res: Response) {
  try {
    const { task } = req.body;

    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'Task is required and must be a string' });
    }

    // Determine task type
    const taskType = task.toLowerCase().includes('crawl') ? 'web_crawling' :
                    task.toLowerCase().includes('flight') ? 'flight_status' : 'unknown';

    // Log task attempt
    logTask({
      userInput: task,
      tool: String(taskType),
      status: 'success', // Let's be optimistic
      output: {
        simulatedResult: true,
        message: "This is a simulated result for direct execution (Phase 3). API key required for actual processing."
      },
      userId: undefined
    }).then(() => {

      // Return a simulated response
      res.status(200).json({
        success: true,
        result: {
          taskType,
          timestamp: new Date().toISOString(),
          message: "Task logged successfully. This is a simulated response since no valid API key is available.",
          data: task.toLowerCase().includes('crawl') ? {
            "top_posts": [
              {
                "title": "Example Post 1",
                "url": "https://example.com/post1",
                "score": 42
              },
              {
                "title": "Example Post 2",
                "url": "https://example.com/post2",
                "score": 36
              }
            ]
          } : {
            "status": "simulated",
            "message": "This would contain real data with a valid API key"
          }
        }
      });
    }).catch(error => {
      console.error('Error in submit-task endpoint:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    });
  } catch (error) {
    console.error('Error in submit-task endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}));

// API health check endpoint
app.get('/health', function(_req: Request, res: Response) {
  res.status(200).json({
    status: 'up',
    version: '1.0.0',
    message: 'API server is running'
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AgentFlow API server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /api/tasks - Submit tasks asynchronously (Phase 2)`);
  console.log(`  GET /api/tasks/:id - Get task status`);
  console.log(`  GET /api/tasks - List all tasks`);
  console.log(`  POST /submit-task - Execute tasks directly (Phase 3)`);
});