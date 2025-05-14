import express from 'express';
import { validateEmailVendorConfig, validateDistributionConfig } from '../configValidators.js';
import { testImapConnection } from '../utils/imapUtils.js';
import { verifyCredentials } from '../utils/credentialUtils.js';
import { sendNotification } from '../utils/notificationUtils.js';
import fs from 'fs';
import * as crypto from 'crypto';
import logger from '../utils/logger';

// Load configurations
const emailVendorConfig = JSON.parse(fs.readFileSync('./configs/multi-vendor.json', 'utf-8'));
const distributionConfig = JSON.parse(fs.readFileSync('./configs/platforms.json', 'utf-8'));

// Validate configurations
const emailVendorValidation = validateEmailVendorConfig(emailVendorConfig);
if (emailVendorValidation.error) {
  logger.error({ event: 'config_validation_failed', configType: 'emailVendor', details: emailVendorValidation.error.details, timestamp: new Date().toISOString() }, 'Email vendor configuration validation failed');
  sendNotification('Email vendor configuration validation failed: ' + emailVendorValidation.error.details);
  process.exit(1);
}

const distributionValidation = validateDistributionConfig(distributionConfig);
if (distributionValidation.error) {
  logger.error({ event: 'config_validation_failed', configType: 'distribution', details: distributionValidation.error.details, timestamp: new Date().toISOString() }, 'Distribution configuration validation failed');
  sendNotification('Distribution configuration validation failed: ' + distributionValidation.error.details);
  process.exit(1);
}

// Test IMAP connection
const imapTestResult = await testImapConnection(emailVendorConfig.vendors.VinSolutions.baseUrl, 993, process.env.VIN_SOLUTIONS_USERNAME, process.env.VIN_SOLUTIONS_PASSWORD);
if (!imapTestResult) {
  logger.error({ event: 'imap_test_failed', vendor: 'VinSolutions', baseUrl: emailVendorConfig.vendors.VinSolutions.baseUrl, timestamp: new Date().toISOString() }, 'IMAP connection test failed');
  sendNotification('IMAP connection test failed.');
  process.exit(1);
}

// Initialize Express app
const app = express();
app.use(express.json());

// Simple in-memory task storage
const taskLogs = {};

// API endpoint for direct task execution (Phase 3)
app.post('/submit-task', (req, res) => {
  try {
    const { task, username, password } = req.body;

    // Verify credentials before processing
    if (!verifyCredentials(username, password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'Task is required and must be a string' });
    }

    // Initialize results tracking
    const results = {
      successes: [],
      failures: [],
    };

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

    // Process attachments (simulated)
    const attachments = []; // Assume this is populated with attachment data
    for (const attachment of attachments) {
      try {
        // Simulate processing the attachment
        // If processing fails, throw an error
        if (Math.random() < 0.5) { // Simulate a 50% chance of failure
          throw new Error(`Failed to process attachment: ${attachment}`);
        }
        results.successes.push(attachment);
      } catch (error) {
        logger.error({ event: 'attachment_processing_failed', taskId, attachment, errorMessage: error.message, stack: error.stack, userId: username, timestamp: new Date().toISOString() }, 'Failed to process attachment');
        results.failures.push(attachment);
      }
    }

    // Update task result with successes and failures
    taskLogs[taskId].result.data = {
      successes: results.successes,
      failures: results.failures,
      message: results.failures.length > 0 ? "Some attachments failed to process." : "All attachments processed successfully."
    };

    // Log the execution
    logger.info({ event: 'task_executed', taskId, taskType, userId: username, timestamp: new Date().toISOString() }, 'Task executed');

    // Return the result
    return res.status(200).json({
      success: true,
      result: taskLogs[taskId].result
    });

  } catch (error) {
    logger.error({ event: 'submit_task_error', errorMessage: error.message, stack: error.stack, timestamp: new Date().toISOString() }, 'Error in submit-task endpoint');
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
  logger.info({ event: 'server_listening', port: PORT, timestamp: new Date().toISOString() }, 'AgentFlow API server running');
  logger.debug({ event: 'server_endpoints', endpoints: ['POST /submit-task'], timestamp: new Date().toISOString() }, 'Available endpoints');
});
