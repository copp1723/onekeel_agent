/**
 * Start Health Checks
 * 
 * This script starts all health check schedulers.
 */
import { startAllHealthChecks } from '../../../../services/healthCheckScheduler.js';
import { logger } from '../../../../shared/logger.js';
logger.info('Starting health check schedulers...');
startAllHealthChecks();
logger.info('Health check schedulers started. Press Ctrl+C to exit.');
// Keep the process running
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down health check schedulers...');
  process.exit(0);
});
// Log unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});
