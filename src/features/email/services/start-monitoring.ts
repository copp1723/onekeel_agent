/**
 * Start Monitoring Script
 * 
 * This script initializes the monitoring services and keeps them running.
 */
import * as monitoringService from '../../../../services/monitoringService.js';
import { logger } from '../../../../shared/logger.js';
import monitoringConfig from '../../../../config/monitoring.js';

logger.info('Starting monitoring services...');
logger.info(`Monitoring configuration: ${JSON.stringify({
  enabled: monitoringConfig.enabled,
  sentryConfigured: !!monitoringConfig.sentry.dsn,
  datadogConfigured: !!monitoringConfig.datadog.apiKey,
  adminEmails: monitoringConfig.adminEmails.length,
})}`);

// Initialize monitoring services
monitoringService.initialize()
  .then(status => {
    logger.info(`Monitoring services initialized: Sentry=${status.sentryInitialized}, DataDog=${status.datadogInitialized}`);
    
    if (!status.sentryInitialized && !status.datadogInitialized) {
      logger.warn('No monitoring services were initialized. Check your configuration.');
      process.exit(1);
    }
    
    logger.info('Monitoring services are running. Press Ctrl+C to exit.');
    
    // Keep the process running
    process.stdin.resume();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT. Shutting down monitoring services...');
      
      try {
        await monitoringService.shutdown();
        logger.info('Monitoring services shut down successfully.');
        process.exit(0);
      } catch (error) {
        logger.error('Error shutting down monitoring services:', error);
        process.exit(1);
      }
    });
    
    // Log unhandled errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      monitoringService.trackError(error, { source: 'uncaughtException' }, true);
    });
    
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason);
      monitoringService.trackError(reason, { source: 'unhandledRejection' }, true);
    });
  })
  .catch(error => {
    logger.error('Failed to initialize monitoring services:', error);
    process.exit(1);
  });
