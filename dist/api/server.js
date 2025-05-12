// src/api/server.ts
import express from 'express';
import { routeHandler } from '../utils/routeHandler.js';
import { parseTask } from '../services/taskParser.js';
import { getTaskLogs } from '../shared/logger.js';
import dotenv from 'dotenv';
import { registerAuthRoutes } from '../server/routes/index.js';
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
        await registerAuthRoutes(app);
        console.log('Authentication routes registered successfully');
    }
    catch (error) {
        console.error('Failed to register authentication routes:', error);
    }
})();
// Set up routes
const router = express.Router();
// Health check
router.get('/health', routeHandler(async (_req, res) => {
    res.status(200).json({
        status: 'up',
        version: '1.0.0',
        message: 'API server is running'
    });
}));
// Test-parser endpoint
router.post('/test-parser', routeHandler(async (req, res) => {
    const task = req.body.task || '';
    // Pass the EKO_API_KEY from environment variables or a default empty string
    const ekoApiKey = process.env.EKO_API_KEY || '';
    const result = await parseTask(task, ekoApiKey);
    res.json(result);
}));
// Tasks listing endpoint
router.get('/tasks', routeHandler(async (_req, res) => {
    const tasks = await getTaskLogs("all");
    res.json(tasks);
}));
// Register API routes
app.use('/api', router);
// Serve the index.html file for the root route
app.get('/', routeHandler((_req, res) => {
    res.sendFile('index.html', { root: './public' });
}));
// TODO: re-add submit-task endpoint
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
//# sourceMappingURL=server.js.map