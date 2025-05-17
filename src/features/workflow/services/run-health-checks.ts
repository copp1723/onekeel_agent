/**
 * Run Health Checks Script
 * 
 * This script runs all health checks and outputs the results.
 */
import { runAllHealthChecks } from '../../../../services/healthService.js';
import { logger } from '../../../../shared/logger.js';

logger.info('Running all health checks...');

runAllHealthChecks()
  .then(results => {
    logger.info('Health check results:');
    
    // Count results by status
    const statusCounts = {
      ok: 0,
      warning: 0,
      error: 0,
      total: results.length,
    };
    
    // Log each result
    results.forEach(result => {
      const { name, status, responseTime, message } = result;
      
      // Update status counts
      if (status === 'ok') {
        statusCounts.ok++;
      } else if (status === 'warning') {
        statusCounts.warning++;
      } else if (status === 'error') {
        statusCounts.error++;
      }
      
      // Log the result
      logger.info(`${name}: ${status} (${responseTime}ms) - ${message || 'No message'}`);
    });
    
    // Log summary
    logger.info(`Health check summary: ${statusCounts.ok}/${statusCounts.total} OK, ${statusCounts.warning} warnings, ${statusCounts.error} errors`);
    
    // Exit with appropriate code
    if (statusCounts.error > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  })
  .catch(error => {
    logger.error('Failed to run health checks:', error);
    process.exit(1);
  });
