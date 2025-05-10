import express, { Router } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Eko } from '@eko-ai/eko';
import { crawlWebsite } from '../tools/crawlWebsite.js';
import { checkFlightStatus } from '../tools/checkFlightStatus.js';
import { getApiKey } from '../services/supabase.js';
import { parseTask, TaskType } from '../services/taskParser.js';
import { logTask } from '../shared/logger.js';
// Load environment variables
dotenv.config();
// Initialize Express app
const app = express();
app.use(express.json());
// Simple in-memory task storage
// In a production app, this would be stored in Supabase/Firestore
const taskLogs = {};
// Create router for tasks API
const tasksRouter = Router();
// Endpoint to submit a new task
tasksRouter.post('/', async function (req, res) {
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
            taskType: 'unknown', // Will be updated after parsing
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        // Return the task ID immediately so client can poll for status
        res.status(202).json({ taskId, message: 'Task accepted and processing' });
        // Process the task asynchronously
        processTask(taskId, task).catch(error => {
            console.error(`Error processing task ${taskId}:`, error);
            taskLogs[taskId].status = 'failed';
            taskLogs[taskId].error = error.message;
        });
    }
    catch (error) {
        console.error('Error submitting task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Endpoint to get task status and results
tasksRouter.get('/:taskId', function (req, res) {
    const { taskId } = req.params;
    if (!taskLogs[taskId]) {
        return res.status(404).json({ error: 'Task not found' });
    }
    res.status(200).json(taskLogs[taskId]);
});
// Endpoint to list all tasks
tasksRouter.get('/', function (_req, res) {
    const tasks = Object.values(taskLogs);
    res.status(200).json(tasks);
});
// Register tasks router
app.use('/api/tasks', tasksRouter);
// Create a router for direct task submission
const submitTaskRouter = Router();
// Handler for direct task submission using generate/execute
submitTaskRouter.post('/', async function (req, res) {
    try {
        const { task } = req.body;
        if (!task || typeof task !== 'string') {
            return res.status(400).json({ error: 'Task is required and must be a string' });
        }
        // Get the Eko API key
        const ekoApiKey = process.env.EKO_API_KEY;
        if (!ekoApiKey) {
            return res.status(500).json({ error: 'API key not available' });
        }
        // Get the Firecrawl API key for web crawling tasks
        const firecrawlApiKey = await getApiKey('firecrawl') || 'demo_firecrawl_key';
        // Configure LLMs
        const llms = {
            default: {
                provider: "openai",
                model: "gpt-4o-mini",
                apiKey: ekoApiKey,
            }
        };
        // Initialize Eko agent with all available tools
        const eko = new Eko({
            llms,
            tools: [
                crawlWebsite(firecrawlApiKey),
                checkFlightStatus()
            ]
        });
        try {
            // Generate and execute the workflow
            console.log(`Generating workflow for task: "${task}"`);
            const workflow = await eko.generate(task);
            console.log('Executing workflow...');
            const result = await eko.execute(workflow);
            // Determine which tool was used based on result or workflow analysis
            // This is a simplistic approach; in a real system we could extract this from the workflow
            const toolUsed = task.toLowerCase().includes('crawl') ? 'crawlWebsite' :
                task.toLowerCase().includes('flight') ? 'checkFlightStatus' : 'unknown';
            // Log successful task execution to database
            await logTask({
                userInput: task,
                tool: toolUsed,
                status: 'success',
                output: result
            });
            // Return the result to the client
            return res.status(200).json({ success: true, result });
        }
        catch (error) {
            console.error('Error executing task:', error);
            // Log failed task execution to database
            await logTask({
                userInput: task,
                tool: 'unknown', // We couldn't determine the tool since execution failed
                status: 'error',
                output: { error: error.message || String(error) }
            });
            return res.status(500).json({
                success: false,
                error: error.message || 'Unknown error during task execution'
            });
        }
    }
    catch (error) {
        console.error('Error in submit-task endpoint:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});
// Register submit-task router
app.use('/submit-task', submitTaskRouter);
// Process a task asynchronously
async function processTask(taskId, taskText) {
    try {
        // Update task status
        taskLogs[taskId].status = 'processing';
        // Get the Eko API key from Supabase
        const ekoApiKey = process.env.EKO_API_KEY;
        if (!ekoApiKey) {
            throw new Error('Eko API key not available');
        }
        // Parse the task to determine the appropriate action
        const parsedTask = await parseTask(taskText, ekoApiKey);
        taskLogs[taskId].taskType = parsedTask.type;
        // Get the Firecrawl API key if needed
        let firecrawlApiKey = null;
        if (parsedTask.type === TaskType.WebCrawling) {
            firecrawlApiKey = await getApiKey('firecrawl');
            if (!firecrawlApiKey) {
                console.log('⚠️ Firecrawl API key not found, using placeholder');
                firecrawlApiKey = 'demo_firecrawl_key';
            }
        }
        // Configure LLMs
        const llms = {
            default: {
                provider: "openai",
                model: "gpt-4o-mini",
                apiKey: ekoApiKey,
            }
        };
        // Collect tools based on the task type
        const tools = [];
        if (parsedTask.type === TaskType.WebCrawling && firecrawlApiKey) {
            tools.push(crawlWebsite(firecrawlApiKey));
        }
        if (parsedTask.type === TaskType.FlightStatus) {
            tools.push(checkFlightStatus());
        }
        // Initialize Eko agent with the appropriate tools
        const eko = new Eko({
            llms,
            tools
        });
        // Execute the task
        const result = await eko.run(taskText);
        // Update task status and store result
        taskLogs[taskId].status = 'completed';
        taskLogs[taskId].result = result;
        taskLogs[taskId].completedAt = new Date().toISOString();
        // Log successful task execution to database
        await logTask({
            userInput: taskText,
            tool: parsedTask.type,
            status: 'success',
            output: result
        });
    }
    catch (error) {
        console.error(`Error processing task ${taskId}:`, error);
        taskLogs[taskId].status = 'failed';
        taskLogs[taskId].error = error.message || String(error);
        taskLogs[taskId].completedAt = new Date().toISOString();
        // Log failed task execution to database
        await logTask({
            userInput: taskText,
            tool: taskLogs[taskId].taskType || 'unknown',
            status: 'error',
            output: { error: error.message || String(error) }
        });
    }
}
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map