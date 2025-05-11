import express, { Router } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Eko } from '@eko-ai/eko';
import { crawlWebsite } from '../tools/crawlWebsite.js';
import { checkFlightStatus } from '../tools/checkFlightStatus.js';
import { extractCleanContent } from '../tools/extractCleanContent.js';
import { summarizeText } from '../tools/summarizeText.js';
import { dealerLogin } from '../tools/dealerLogin.js';
import { fetchCRMReportTool } from '../tools/fetchCRMReport.js';
import { getApiKey } from '../services/supabase.js';
import { parseTask } from '../services/taskParser.js';
import { TaskType } from '../types.js';
import { logTask, getTaskLogs } from '../shared/logger.js';
import { executePlan } from '../agent/executePlan.js';
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
// Serve the index.html file for the root route
app.get('/', (_req, res) => {
    res.sendFile('index.html', { root: './public' });
});
// Simple in-memory task storage
// In a production app, this would be stored in Supabase/Firestore
const taskLogs = {};
// Create router for tasks API
const tasksRouter = Router();
// Get a task status endpoint
tasksRouter.get('/:taskId', ((req, res, _next) => {
    const { taskId } = req.params;
    if (!taskLogs[taskId]) {
        return res.status(404).json({ error: 'Task not found' });
    }
    res.status(200).json(taskLogs[taskId]);
}));
// List all tasks endpoint
tasksRouter.get('/', ((req, res, _next) => {
    // Get user ID from the authenticated user (if available)
    const userId = req.user?.claims?.sub;
    // Use in-memory task logs for compatibility with existing code
    const tasks = Object.values(taskLogs);
    // If user is authenticated, filter tasks to show only their own
    if (userId) {
        const userTasks = tasks.filter(task => task.userId === userId);
        res.status(200).json(userTasks);
        return;
    }
    // Otherwise, show all tasks
    res.status(200).json(tasks);
}));
// List user's tasks from the database
tasksRouter.get('/user', (async (req, res, _next) => {
    try {
        // Get user ID from the authenticated user (required)
        const userId = req.user?.claims?.sub;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required to access personal tasks' });
            return;
        }
        // Get user's tasks from database
        const userTasks = await getTaskLogs(userId);
        res.status(200).json(userTasks);
    }
    catch (error) {
        console.error('Error retrieving user tasks:', error);
        res.status(500).json({ error: 'Failed to retrieve user tasks' });
    }
}));
// Register tasks GET endpoints
app.use('/api/tasks', tasksRouter);
// Unified task submission endpoint for both sync and async operations
app.post('/submit-task', async (req, res) => {
    const { task } = req.body;
    if (!task || typeof task !== 'string') {
        return res.status(400).json({ error: 'Task is required and must be a string' });
    }
    // Get user ID from the authenticated user (if available)
    const userId = req.user?.claims?.sub;
    // Log authentication status for debugging
    if (userId) {
        console.log(`Task submitted by authenticated user: ${userId}`);
    }
    else {
        console.log('Task submitted by unauthenticated user');
    }
    // Get the Eko API key for validation (used in both async and sync paths)
    const ekoApiKey = process.env.EKO_API_KEY;
    if (!ekoApiKey) {
        return res.status(500).json({ error: 'API key not available' });
    }
    // For the async API, validate the task before accepting it
    const isAsync = req.path === '/api/tasks';
    if (isAsync) {
        try {
            // Parse the task first to see if it's valid
            const parsedTask = await parseTask(task, ekoApiKey);
            // Check if the task parsing resulted in an error
            if (parsedTask.error) {
                console.error("❌ Task parser validation error:", parsedTask.error);
                // Return a 400 Bad Request with the specific error message
                return res.status(400).json({
                    error: parsedTask.error
                });
            }
            // Generate a unique ID for this task
            const taskId = crypto.randomUUID();
            console.log(`Task submitted: ${taskId} - ${task}`);
            // Log the new task
            taskLogs[taskId] = {
                id: taskId,
                task,
                taskType: parsedTask.type, // Set the detected type immediately
                status: 'pending',
                createdAt: new Date().toISOString(),
                userId: userId // Include the user ID if available
            };
            // Process the task asynchronously
            processTask(taskId, task, userId).catch(error => {
                console.error(`Error processing task ${taskId}:`, error);
                taskLogs[taskId].status = 'failed';
                taskLogs[taskId].error = error.message;
                taskLogs[taskId].completedAt = new Date().toISOString();
            });
            // Return the task ID immediately
            return res.status(201).json({
                id: taskId,
                message: 'Task submitted successfully'
            });
        }
        catch (error) {
            console.error("Error during task validation:", error);
            return res.status(500).json({
                error: error.message || "Error validating task"
            });
        }
    }
    // For synchronous execution (submit-task), execute immediately 
    try {
        // Get the Eko API key
        const ekoApiKey = process.env.EKO_API_KEY;
        if (!ekoApiKey) {
            return res.status(500).json({ error: 'API key not available' });
        }
        // Get the Firecrawl API key for web crawling tasks
        const firecrawlApiKey = await getApiKey('firecrawl') || 'demo_firecrawl_key';
        // Parse the task to determine what type it is
        const parsedTask = await parseTask(task, ekoApiKey);
        const taskId = crypto.randomUUID();
        console.log(`Task executed directly: ${taskId} - ${parsedTask.type}`);
        console.log('Task text:', task);
        console.log('Parsed task:', JSON.stringify(parsedTask, null, 2));
        // Check if there was a parsing error
        if (parsedTask.error) {
            console.error(`❌ Task parser error (${taskId}):`, parsedTask.error);
            console.log("Returning 400 Bad Request with error message");
            return res.status(400).json({ success: false, error: parsedTask.error });
        }
        // Create tools map
        const toolsMap = {};
        // Register all available tools
        const crawlTool = crawlWebsite(firecrawlApiKey);
        const flightTool = checkFlightStatus();
        const extractTool = extractCleanContent();
        const summarizeTool = summarizeText(ekoApiKey);
        toolsMap[TaskType.WebCrawling] = crawlTool;
        toolsMap[TaskType.FlightStatus] = flightTool;
        toolsMap[TaskType.WebContentExtraction] = extractTool;
        toolsMap[TaskType.SummarizeText] = summarizeTool;
        let result;
        // Initialize toolUsed as a string for tracking tools used in processing
        let toolUsed = TaskType.Unknown.toString();
        // Handle multi-step execution
        if (parsedTask.type === TaskType.MultiStep && parsedTask.plan) {
            // Execute the plan using the execution engine
            const executionResult = await executePlan(parsedTask.plan, toolsMap);
            result = {
                type: TaskType.MultiStep,
                timestamp: new Date().toISOString(),
                message: "Task executed with simulated Eko Agent",
                data: executionResult.finalOutput
            };
            // Record the tools used as a string
            toolUsed = parsedTask.plan.steps.map(step => step.tool.toString()).join(',');
        }
        // Handle direct tool execution for specific task types
        else if (parsedTask.type === TaskType.WebContentExtraction) {
            result = {
                type: TaskType.WebContentExtraction,
                timestamp: new Date().toISOString(),
                message: "Task executed with simulated Eko Agent",
                data: await extractTool.handler(parsedTask.parameters)
            };
            toolUsed = TaskType.WebContentExtraction;
        }
        else if (parsedTask.type === TaskType.SummarizeText) {
            result = {
                type: TaskType.SummarizeText,
                timestamp: new Date().toISOString(),
                message: "Task executed with simulated Eko Agent",
                data: await summarizeTool.handler(parsedTask.parameters)
            };
            toolUsed = TaskType.SummarizeText;
        }
        else if (parsedTask.type === TaskType.WebCrawling) {
            result = {
                type: TaskType.WebCrawling,
                timestamp: new Date().toISOString(),
                message: "Task executed with simulated Eko Agent",
                // Ensure we have required parameters for web crawling
                data: await crawlTool.handler({
                    url: parsedTask.parameters.url || 'https://example.com', // Default URL as fallback
                    depth: parsedTask.parameters.depth,
                    maxPages: parsedTask.parameters.maxPages
                })
            };
            toolUsed = TaskType.WebCrawling.toString();
        }
        else if (parsedTask.type === TaskType.FlightStatus) {
            result = {
                type: TaskType.FlightStatus,
                timestamp: new Date().toISOString(),
                message: "Task executed with simulated Eko Agent",
                // Ensure we have required parameters for flight status check
                data: await flightTool.handler({
                    flightNumber: parsedTask.parameters.flightNumber || 'UA123', // Default flight number as fallback
                    date: parsedTask.parameters.date
                })
            };
            toolUsed = TaskType.FlightStatus.toString();
        }
        // For testing purposes, check if the task is about summarizing content
        else if ((task.toLowerCase().includes('summarize') || task.toLowerCase().includes('summary'))) {
            console.log("Detected summarize keyword in:", task);
            // Check if it also has a URL
            if (task.match(/https?:\/\/[^\s]+/)) {
                console.log("Also found URL in task");
                const urlMatch = task.match(/https?:\/\/[^\s]+/);
                const url = urlMatch ? urlMatch[0] : '';
                console.log(`Creating multi-step plan manually for task: "${task}"`);
                // Create a multi-step plan
                const plan = {
                    steps: [
                        {
                            tool: 'extractCleanContent',
                            input: { url }
                        },
                        {
                            tool: 'summarizeText',
                            input: { text: '{{step0.output.content}}' }
                        }
                    ]
                };
                // Execute the plan
                console.log('Executing manually created plan');
                const executionResult = await executePlan(plan, toolsMap);
                result = {
                    type: TaskType.MultiStep,
                    timestamp: new Date().toISOString(),
                    message: "Task executed with multi-step execution",
                    data: executionResult.finalOutput
                };
                // Record the tools used as a string for logging
                toolUsed = `${TaskType.ExtractContent},${TaskType.SummarizeText}`;
            }
            else {
                console.log("No URL found in summarize task");
                result = {
                    type: TaskType.Unknown, // Using Unknown type for errors
                    timestamp: new Date().toISOString(),
                    message: "Cannot summarize without a URL",
                    data: { error: "Please provide a URL to summarize content from" }
                };
            }
        }
        else {
            result = {
                type: parsedTask.type,
                timestamp: new Date().toISOString(),
                message: "Task received but not implemented",
                data: { message: "Task type not supported yet" }
            };
        }
        // Log the task execution
        await logTask({
            userInput: task,
            tool: toolUsed,
            status: 'success',
            output: result,
            userId: userId
        });
        // Return the immediate result
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error('Error executing task:', error);
        // Log the error
        await logTask({
            userInput: task,
            tool: 'unknown',
            status: 'error',
            output: { error: error.message || String(error) },
            userId: userId
        });
        return res.status(500).json({
            success: false,
            error: error.message || 'Task execution failed'
        });
    }
});
// Process a task asynchronously
async function processTask(taskId, taskText, userId) {
    try {
        console.log(`Processing task: ${taskId}${userId ? ` for user: ${userId}` : ''}`);
        // Update task status
        taskLogs[taskId].status = 'processing';
        // Get the Eko API key 
        const ekoApiKey = process.env.EKO_API_KEY;
        if (!ekoApiKey) {
            throw new Error('Eko API key not available');
        }
        // We may have already parsed the task during validation,
        // but we'll parse it again here for consistency since the processing function
        // could be called independently
        const parsedTask = await parseTask(taskText, ekoApiKey);
        // If parsing returned an error, fail the task immediately
        if (parsedTask.error) {
            console.error(`❌ Task parsing error (${taskId}):`, parsedTask.error);
            taskLogs[taskId].status = 'failed';
            taskLogs[taskId].error = parsedTask.error;
            taskLogs[taskId].completedAt = new Date().toISOString();
            // Log the error
            await logTask({
                userInput: taskText,
                tool: 'parser',
                status: 'error',
                output: { error: parsedTask.error },
                userId: userId // Include the user ID if available
            });
            return; // Exit early as we can't process this task
        }
        // Log the parsed task for debugging
        console.log(`Parsed task (${taskId}):`, JSON.stringify(parsedTask, null, 2));
        // Update the task type in the logs
        taskLogs[taskId].taskType = parsedTask.type;
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
        // Collect tools based on the task type and prepare a tools map for plan execution
        const tools = [];
        const toolsMap = {};
        // Register all available tools
        if (firecrawlApiKey) {
            const crawlTool = crawlWebsite(firecrawlApiKey);
            tools.push(crawlTool);
            toolsMap['crawlWebsite'] = crawlTool;
        }
        const flightTool = checkFlightStatus();
        tools.push(flightTool);
        toolsMap[TaskType.FlightStatus] = flightTool;
        const extractTool = extractCleanContent();
        tools.push(extractTool);
        toolsMap[TaskType.WebContentExtraction] = extractTool;
        const summarizeTool = summarizeText(ekoApiKey);
        tools.push(summarizeTool);
        toolsMap[TaskType.SummarizeText] = summarizeTool;
        const dealerLoginTool = dealerLogin();
        tools.push(dealerLoginTool);
        toolsMap[TaskType.DealerLogin] = dealerLoginTool;
        const crmReportTool = fetchCRMReportTool();
        tools.push(crmReportTool);
        toolsMap[TaskType.FetchCRMReport] = crmReportTool;
        // Initialize Eko agent with the appropriate tools
        const eko = new Eko({
            llms
        });
        let result;
        // Initialize toolUsed as a string representation of the task type
        let toolUsed = parsedTask.type.toString();
        // Handle multi-step tasks with execution plan
        if (parsedTask.type === TaskType.MultiStep && parsedTask.plan) {
            console.log(`Executing multi-step plan for task: "${taskText}"`);
            console.log('Plan:', JSON.stringify(parsedTask.plan, null, 2));
            // Execute the plan using our execution engine
            const executionResult = await executePlan(parsedTask.plan, toolsMap);
            // Use the final output as the result
            result = {
                type: TaskType.MultiStep,
                timestamp: new Date().toISOString(),
                message: "Task processed with multi-step execution",
                data: executionResult.finalOutput,
                steps: executionResult.stepResults.map((step, index) => ({
                    step: index,
                    tool: parsedTask.plan?.steps[index].tool,
                    success: !step.error,
                    error: step.error,
                    output: step.output ? (typeof step.output === 'object' ? step.output : { value: step.output }) : null
                }))
            };
            // Record all tools used in the sequence
            // We join the tool names but keep them as string for database logging
            toolUsed = parsedTask.plan.steps.map(step => {
                // Try to map the string tool name to TaskType when possible for consistency
                try {
                    return TaskType[step.tool].toString();
                }
                catch (e) {
                    // Fallback to the original tool name if not in TaskType enum
                    return step.tool;
                }
            }).join(',');
        }
        // Handle single-step tasks with the appropriate tool
        else if (parsedTask.type === TaskType.WebContentExtraction) {
            result = {
                type: TaskType.WebContentExtraction,
                timestamp: new Date().toISOString(),
                message: "Task processed with simulated agent",
                data: await extractTool.handler(parsedTask.parameters)
            };
            toolUsed = TaskType.ExtractContent.toString();
        }
        else if (parsedTask.type === TaskType.SummarizeText) {
            result = {
                type: TaskType.SummarizeText,
                timestamp: new Date().toISOString(),
                message: "Task processed with simulated agent",
                data: await summarizeTool.handler(parsedTask.parameters)
            };
            toolUsed = TaskType.SummarizeText.toString();
        }
        else if (parsedTask.type === TaskType.WebCrawling) {
            // Ensure we have required parameters for web crawling
            const crawlParams = {
                url: parsedTask.parameters.url || 'https://example.com', // Default URL as fallback
                depth: parsedTask.parameters.depth,
                maxPages: parsedTask.parameters.maxPages
            };
            result = {
                type: TaskType.WebCrawling,
                timestamp: new Date().toISOString(),
                message: "Task processed with simulated agent",
                data: await toolsMap[TaskType.WebCrawling].handler(crawlParams)
            };
            toolUsed = TaskType.CrawlWebsite.toString();
        }
        else if (parsedTask.type === TaskType.FlightStatus) {
            // Ensure we have required parameters for flight status check
            const flightParams = {
                flightNumber: parsedTask.parameters.flightNumber || 'UA123', // Default flight number as fallback
                date: parsedTask.parameters.date
            };
            result = {
                type: TaskType.FlightStatus,
                timestamp: new Date().toISOString(),
                message: "Task processed with simulated agent",
                data: await flightTool.handler(flightParams)
            };
            toolUsed = TaskType.FlightStatus.toString();
        }
        else if (parsedTask.type === TaskType.DealerLogin) {
            // For dealer login tasks, we need to include the user ID in the parameters
            // so the dealerLogin tool can access their stored credentials
            const dealerLoginParams = {
                ...parsedTask.parameters,
                userId: userId // Pass the user ID for credential lookup
            };
            result = {
                type: TaskType.DealerLogin,
                timestamp: new Date().toISOString(),
                message: "Task processed with dealer login agent",
                data: await dealerLoginTool.handler(dealerLoginParams)
            };
            toolUsed = TaskType.DealerLogin.toString();
        }
        else if (parsedTask.type === TaskType.FetchCRMReport) {
            // For CRM report tasks, we need to include the user ID in the parameters
            // so the fetchCRMReport tool can access their stored credentials
            const crmReportParams = {
                ...parsedTask.parameters,
                userId: userId // Pass the user ID for credential lookup
            };
            result = {
                type: TaskType.FetchCRMReport,
                timestamp: new Date().toISOString(),
                message: "Task processed with CRM report extraction agent",
                data: await crmReportTool.handler(crmReportParams)
            };
            toolUsed = TaskType.FetchCRMReport.toString();
        }
        else if (parsedTask.type === TaskType.Unknown) {
            // Handle unknown task type with possible error message
            result = {
                type: TaskType.Unknown,
                timestamp: new Date().toISOString(),
                message: "Task processed with simulated agent",
                data: {
                    message: parsedTask.error || "Task type not supported yet"
                }
            };
            toolUsed = TaskType.Unknown.toString();
        }
        else {
            // For other tasks, use the Eko agent
            result = await eko.run(taskText);
        }
        // Update task status and also store what tool was used
        taskLogs[taskId].taskType = typeof toolUsed === 'string' ? toolUsed : String(toolUsed);
        // Update task status and store result
        taskLogs[taskId].status = 'completed';
        taskLogs[taskId].result = result;
        taskLogs[taskId].completedAt = new Date().toISOString();
        // Log successful task execution to database
        await logTask({
            userInput: taskText,
            tool: parsedTask.type,
            status: 'success',
            output: result,
            userId: userId
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
            output: { error: error.message || String(error) },
            userId: userId
        });
    }
}
// Test endpoint for parser
app.post('/test-parser', async (req, res) => {
    const { task } = req.body;
    if (!task || typeof task !== 'string') {
        return res.status(400).json({ error: 'Task is required and must be a string' });
    }
    try {
        // Get the API key
        const ekoApiKey = process.env.EKO_API_KEY;
        if (!ekoApiKey) {
            return res.status(500).json({ error: 'API key not available' });
        }
        // Parse the task
        console.log('TEST PARSER - Task:', task);
        const parsedTask = await parseTask(task, ekoApiKey);
        // Return the parsed result including any errors
        return res.status(200).json({
            task,
            parsed: parsedTask,
            hasError: !!parsedTask.error
        });
    }
    catch (error) {
        console.error('Error in test parser:', error);
        return res.status(500).json({ error: error.message });
    }
});
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        version: '1.0.0',
        features: {
            webCrawling: true,
            flightStatus: true,
            contentExtraction: true,
            multiStepExecution: true,
            summarization: true
        }
    });
});
// Start the server
const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, () => {
    console.log(`AI Agent API server running on port ${port}`);
    console.log('Available endpoints:');
    console.log('  GET / - Web UI for task submission and result viewing');
    console.log('  POST /api/tasks - Submit a new task');
    console.log('  GET /api/tasks/:taskId - Get task status');
    console.log('  GET /api/tasks - List all tasks');
    console.log('  POST /submit-task - Execute tasks directly');
    console.log('  GET /health - Health check endpoint');
});
// Export for testing and external use
export { app, server };
//# sourceMappingURL=server.js.map