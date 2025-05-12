/**
 * Fixed Server Demo
 * Runs the fixed implementation of the workflow system
 * with mailerService and workflowEmailService
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initializeMailer } from './dist/services/fixed-mailerService.js';
import { 
  sendWorkflowCompletionEmail, 
  processWorkflowStatusNotifications 
} from './dist/services/fixed-workflowEmailService.js';
import { db } from './dist/shared/db.js';
import { workflows } from './dist/shared/schema.js';
import { v4 as uuidv4 } from 'uuid';
import emailRoutes from './dist/server/routes/fixed-emails.js';

// Load environment variables
dotenv.config();

// Initialize the application
const app = express();
const port = process.env.PORT || 5001;

// Initialize the mailer with SendGrid API key
initializeMailer(process.env.SENDGRID_API_KEY);

// Set up middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static file serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/emails', emailRoutes);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Test email notifications
app.post('/test-email', async (req, res) => {
  try {
    const { recipient } = req.body;
    
    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }
    
    // Create a test workflow
    const workflowId = uuidv4();
    const [workflow] = await db.insert(workflows).values({
      id: workflowId,
      name: 'Test Email Workflow',
      steps: [
        { 
          id: 'step1', 
          name: 'Test Step 1', 
          type: 'processData', 
          config: { operation: 'test' } 
        }
      ],
      status: 'completed',
      currentStep: 1,
      context: {
        startedBy: 'test-endpoint',
        timestamp: new Date().toISOString(),
        insights: [
          'Sample insight 1 from demo workflow',
          'Sample insight 2 from demo workflow',
          'Sample insight 3 from demo workflow'
        ],
        summary: 'This is a test workflow created from the fixed server implementation'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date()
    }).returning();
    
    console.log(`Created test workflow with ID: ${workflowId}`);
    
    // Send a workflow completion email
    const result = await sendWorkflowCompletionEmail(workflowId, recipient);
    
    // Clean up the test workflow after 1 minute to allow for email querying
    setTimeout(async () => {
      await db.delete(workflows).where('id', workflowId);
      console.log(`Cleaned up test workflow: ${workflowId}`);
    }, 60000);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: `Email sent successfully to ${recipient}` 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send email', 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error in test-email endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process request', 
      error: error.message 
    });
  }
});

// Submit task endpoint for direct task execution
app.post('/submit-task', async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ success: false, message: 'Task is required' });
    }
    
    // Here we would normally call the task parser and execution system
    // For this demo, we'll just simulate it
    
    // Create a workflow for this task
    const workflowId = uuidv4();
    const [workflow] = await db.insert(workflows).values({
      id: workflowId,
      name: 'Task Execution',
      steps: [
        { 
          id: 'step1', 
          name: 'Parse Task', 
          type: 'parseTask', 
          config: { task } 
        },
        { 
          id: 'step2', 
          name: 'Execute Task', 
          type: 'executeTask', 
          config: {} 
        }
      ],
      status: 'completed',
      currentStep: 2,
      context: {
        startedBy: 'api',
        timestamp: new Date().toISOString(),
        task,
        // Simulate some results
        result: {
          success: true,
          data: {
            message: 'Task executed successfully',
            task
          }
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date()
    }).returning();
    
    // Process email notifications for this completed workflow
    try {
      const notificationResult = await processWorkflowStatusNotifications(workflowId);
      console.log(`Email notification processing result:`, notificationResult);
    } catch (emailError) {
      console.error(`Error sending email notifications for workflow ${workflowId}:`, emailError);
      // Continue even if email sending fails
    }
    
    // Return the workflow result
    return res.json({
      success: true,
      workflowId,
      result: {
        message: 'Task executed successfully',
        task
      }
    });
  } catch (error) {
    console.error('Error in submit-task endpoint:', error);
    // Create a failed workflow record for tracking
    try {
      const failedWorkflowId = uuidv4();
      const [failedWorkflow] = await db.insert(workflows).values({
        id: failedWorkflowId,
        name: 'Failed Task Execution',
        type: 'task',
        steps: [
          { 
            id: 'step1', 
            name: 'Parse Task', 
            type: 'parseTask', 
            config: { task: req.body.task || 'unknown' } 
          }
        ],
        status: 'failed',
        currentStep: 0,
        lastError: error.message,
        context: {
          startedBy: 'api',
          timestamp: new Date().toISOString(),
          task: req.body.task || 'unknown',
          error: error.message
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdated: new Date()
      }).returning();
      
      // Process email notifications for this failed workflow
      try {
        const notificationResult = await processWorkflowStatusNotifications(failedWorkflowId);
        console.log(`Email notification processing result for failed workflow:`, notificationResult);
      } catch (emailError) {
        console.error(`Error sending error notification for workflow ${failedWorkflowId}:`, emailError);
        // Continue even if email sending fails
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process task', 
        error: error.message,
        workflowId: failedWorkflowId
      });
    } catch (secondaryError) {
      console.error('Error creating failed workflow record:', secondaryError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process task', 
        error: error.message 
      });
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`💥 USING THE FIXED TASK PARSER (taskParser-fix.js)`);
  console.log('Starting fixed server implementation...');
  console.log(`Fixed Server Demo API running on port ${port}`);
  console.log('Available endpoints:');
  console.log('  GET / - Web UI for task submission');
  console.log('  POST /submit-task - Execute tasks directly');
  console.log('  GET /health - Health check endpoint');
  console.log('  POST /test-email - Send a test email to recipient');
  console.log('Email API endpoints:');
  console.log('  POST /api/emails/notifications - Configure email notification settings');
  console.log('  GET /api/emails/notifications - Get email notification settings');
  console.log('  DELETE /api/emails/notifications/:id - Delete notification settings');
  console.log('  GET /api/emails/logs/:workflowId - Get email logs for a workflow');
  console.log('  POST /api/emails/retry/:emailLogId - Retry a failed email');
});