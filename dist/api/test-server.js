import * as express from 'express';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
// Load environment variables
dotenv.config();
// Initialize Express app
const app = express.default();
app.use(express.default.json());
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
        // Log task in memory
        const taskType = task.toLowerCase().includes('crawl') ? 'web_crawling' :
            task.toLowerCase().includes('flight') ? 'flight_status' : 'unknown';
        taskLogs[taskId] = {
            id: taskId,
            task,
            taskType,
            status: 'completed',
            result: {
                taskType,
                timestamp: new Date().toISOString(),
                message: "Phase 3 implementation - Task execution with immediate response",
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
                    "status": "completed",
                    "message": "Task processed successfully"
                }
            },
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
        };
        // Return the result
        return res.status(200).json({
            success: true,
            result: taskLogs[taskId].result
        });
    }
    catch (error) {
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
        message: 'Test API server is running'
    });
});
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`AgentFlow Test API server running on port ${PORT}`);
    console.log(`Available endpoints:`);
    console.log(`  POST /submit-task - Execute tasks directly (Phase 3)`);
});
//# sourceMappingURL=test-server.js.map