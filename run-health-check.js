/**
 * Run IMAP health check
 *
 * This script runs a health check on the IMAP connection.
 */

import { pingImapConnection } from './dist/services/imapIngestionService.js';
import { logger } from './dist/shared/logger.js';

async function runHealthCheck() {
  logger.info('Running IMAP health check...');

  try {
    const result = await pingImapConnection();
    logger.info(`IMAP health check result: ${result ? 'SUCCESS' : 'FAILURE'}`);

    if (result) {
      logger.info('IMAP connection is healthy');
      process.exit(0);
    } else {
      logger.error('IMAP connection is not healthy');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Error running IMAP health check:', error);
    process.exit(1);
  }
}

runHealthCheck();
