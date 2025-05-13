/**
 * Health Monitoring API Routes
 *
 * Exposes endpoints for checking system health and viewing health metrics
 */

import express, { Request, Response } from 'express';
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
import { routeHandler } from '../../utils/routeHandler.js';

const router = express.Router();

/**
 * Get overall system health summary
 */
router.get('/summary', routeHandler(async (_req: Request, res: Response) => {
  const summary = await getHealthSummary();
  return res.json(summary);
}));

/**
 * Manually run all health checks
 */
router.post('/checks/run', routeHandler(async (_req: Request, res: Response) => {
  const results = await runAllHealthChecks();
  return res.json(results);
}));

/**
 * Run a specific health check
 */
router.post('/checks/:id/run', routeHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await runHealthCheck(id);

  if (result) {
    return res.json(result);
  } else {
    return res.status(404).json({ error: `Health check "${id}" not found` });
  }
}));

/**
 * Get all health checks
 */
router.get('/checks', routeHandler(async (_req: Request, res: Response) => {
  const healthChecks = await getLatestHealthChecks();
  return res.json(healthChecks);
}));

/**
 * Get health logs for a specific check
 */
router.get('/logs/:checkId', routeHandler(async (req: Request, res: Response) => {
  const { checkId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

  const logs = await getHealthLogs(checkId, limit);
  return res.json(logs);
}));

/**
 * Register routes
 */
export function registerHealthRoutes(app: express.Express): void {
  // Default health check endpoint for basic status
  app.get('/api/health', routeHandler(async (_req: Request, res: Response) => {
    const dbCheck = await checkDatabaseHealth();

    // Simple health check that just verifies the database
    return res.json({
      status: dbCheck.status,
      message: 'API is running',
      timestamp: new Date(),
      database: {
        status: dbCheck.status,
        message: dbCheck.message
      }
    });
  }));

  // Register the health monitoring dashboard routes
  app.use('/api/health-monitoring', router);

  // Register default health checks
  registerHealthCheck('database', checkDatabaseHealth);
  registerHealthCheck('email', checkEmailService);
  registerHealthCheck('ai', checkAIService);
  registerHealthCheck('scheduler', checkSchedulerService);

  console.log('Health monitoring routes registered');
}