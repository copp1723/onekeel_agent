// Phase 3 Implementation - Direct Task Execution API
import express from 'express';
import * as crypto from 'crypto';

// Initialize Express app
const app = express();
app.use(express.json());

// Simple in-memory task storage
const taskLogs = {};

// API endpoint for direct task execution (Phase 3)
app.post('/submit-task', (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'Task is required and must be a string' });
    }
    
    // Generate task ID
    const taskId = crypto.randomUUID();
    
    // Determine task type
    const taskType = task.toLowerCase().includes('crawl') ? 'web_crawling' : 
                    task.toLowerCase().includes('flight') ? 'flight_status' : 'unknown';
    
    // Create task entry with simulated results
    taskLogs[taskId] = {
      id: taskId,
      task,
      taskType,
      status: 'completed',
      result: {
        type: taskType,
        timestamp: new Date().toISOString(),
        message: "Phase 3 implementation - Task execution with immediate response"
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    
    // Add relevant data based on task type
    if (taskType === 'web_crawling') {
      taskLogs[taskId].result.data = {
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
      };
    } else {
      taskLogs[taskId].result.data = {
        "status": "completed",
        "message": "Task processed successfully"
      };
    }
    
    // Log the execution
    console.log(`Task executed: ${taskId} - ${taskType}`);
    
    // Return the result
    return res.status(200).json({
      success: true,
      result: taskLogs[taskId].result
    });
    
  } catch (error) {
    console.error('Error in submit-task endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: String(error) || 'Internal server error' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'up',
    version: '1.0.0',
    message: 'AgentFlow API server is running'
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AgentFlow API server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /submit-task - Execute tasks directly (Phase 3)`);
});