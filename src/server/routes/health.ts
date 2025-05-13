/**
 * Health Monitoring API Routes
 * 
 * Exposes endpoints for checking system health and viewing health metrics
 */

import express from 'express';
import {
  runAllHealthChecks,
  runHealthCheck,
  getLatestHealthChecks,
  getHealthLogs,
  getHealthSummary,
  registerHealthCheck,
  checkDatabaseHealth,
  checkEmailService,
  checkAIService,
  checkSchedulerService
} from '../../services/healthService.js';

const router = express.Router();

/**
 * Get overall system health summary
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await getHealthSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting health summary:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve health summary',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Manually run all health checks
 */
router.post('/checks/run', async (req, res) => {
  try {
    const results = await runAllHealthChecks();
    res.json(results);
  } catch (error) {
    console.error('Error running health checks:', error);
    res.status(500).json({ 
      error: 'Failed to run health checks',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Run a specific health check
 */
router.post('/checks/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await runHealthCheck(id);
    
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: `Health check "${id}" not found` });
    }
  } catch (error) {
    console.error(`Error running health check ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Failed to run health check',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get all health checks
 */
router.get('/checks', async (req, res) => {
  try {
    const healthChecks = await getLatestHealthChecks();
    res.json(healthChecks);
  } catch (error) {
    console.error('Error getting health checks:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve health checks',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get health logs for a specific check
 */
router.get('/logs/:checkId', async (req, res) => {
  try {
    const { checkId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    
    const logs = await getHealthLogs(checkId, limit);
    res.json(logs);
  } catch (error) {
    console.error(`Error getting health logs for ${req.params.checkId}:`, error);
    res.status(500).json({ 
      error: 'Failed to retrieve health logs',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Register routes
 */
export function registerHealthRoutes(app: express.Express): void {
  // Default health check endpoint for basic status
  app.get('/api/health', async (req, res) => {
    try {
      const dbCheck = await checkDatabaseHealth();
      
      // Simple health check that just verifies the database
      res.json({
        status: dbCheck.status,
        message: 'API is running',
        timestamp: new Date(),
        database: {
          status: dbCheck.status,
          message: dbCheck.message
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Register the health monitoring dashboard routes
  app.use('/api/health-monitoring', router);
  
  // Register default health checks
  registerHealthCheck('database', checkDatabaseHealth);
  registerHealthCheck('email', checkEmailService);
  registerHealthCheck('ai', checkAIService);
  registerHealthCheck('scheduler', checkSchedulerService);
  
  console.log('Health monitoring routes registered');
}