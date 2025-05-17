/**
 * Health Check Scheduler
 *
 * This service schedules and runs periodic health checks for various system components.
 * It uses node-cron to schedule the checks at regular intervals.
 */
import * as cron from 'node-cron';
import { logger } from '../shared/logger.js';
import { pingImapConnection } from './imapIngestionService.js';
import { isError } from '../utils/errorUtils.js';
import { db } from '../shared/db.js';
import { healthChecks } from '../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { sendAdminAlert } from './alertMailer.js';
// Track active schedulers
const activeSchedulers: Record<string, cron.ScheduledTask> = {};
/**
 * Start the IMAP health check scheduler
 * Runs every 5 minutes by default
 */
export function startImapHealthCheck(cronExpression = '*/5 * * * *'): void {
  if (activeSchedulers['imap']) {
    logger.info('IMAP health check scheduler already running');
    return;
  }
  logger.info(`Starting IMAP health check scheduler with cron: ${cronExpression}`);
  try {
    const task = cron.schedule(cronExpression, async () => {
      logger.info('Running scheduled IMAP health check');
      try {
        const result = await pingImapConnection();
        logger.info(`IMAP health check completed with result: ${result ? 'success' : 'failure'}`);
        // Check for prolonged downtime (>15 minutes)
        if (!result) {
          const lastSuccessfulCheck = await db
            .select()
            .from(healthChecks)
            .where(eq(healthChecks.id, 'imap'.toString()))
            .where(eq(healthChecks.status, 'ok'))
            .orderBy(desc(healthChecks.lastChecked))
            .limit(1);
          if (lastSuccessfulCheck.length > 0) {
            const lastSuccess = lastSuccessfulCheck[0].lastChecked;
            const fifteenMinutesAgo = new Date();
            fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
            if (lastSuccess < fifteenMinutesAgo) {
              // Get the last alert time to implement throttling
              const lastAlertCheck = await db
                .select()
                .from(healthChecks)
                .where(eq(healthChecks.id, 'imap-downtime-alert'.toString()))
                .limit(1);
              const now = new Date();
              const thirtyMinutesAgo = new Date();
              thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
              // Only send alert if we haven't sent one in the last 30 minutes
              const shouldSendAlert = lastAlertCheck.length === 0 ||
                lastAlertCheck[0].lastChecked < thirtyMinutesAgo;
              if (shouldSendAlert) {
                const downTimeMinutes = Math.round((now.getTime() - lastSuccess.getTime()) / (60 * 1000));
                await sendAdminAlert(
                  'IMAP Service Extended Downtime',
                  `The IMAP service has been down for ${downTimeMinutes} minutes. This may affect email ingestion.`,
                  {
                    severity: 'critical',
                    component: 'IMAP Ingestion',
                    details: {
                      lastSuccessfulCheck: lastSuccess.toISOString(),
                      downTimeMinutes,
                    }
                  }
                );
                // Record that we sent an alert
                await db
                  .insert(healthChecks)
                  .values({
                    id: 'imap-downtime-alert',
                    name: 'IMAP Downtime Alert',
                    status: 'error',
                    responseTime: 0,
                    lastChecked: now,
                    message: `Sent alert for ${downTimeMinutes} minutes of downtime`,
                    details: JSON.stringify({
                      lastSuccessfulCheck: lastSuccess.toISOString(),
                      downTimeMinutes,
                    }),
                  })
                  .onConflictDoUpdate({
                    target: healthChecks.id,
                    set: {
                      lastChecked: now,
                      message: `Sent alert for ${downTimeMinutes} minutes of downtime`,
                      details: JSON.stringify({
                        lastSuccessfulCheck: lastSuccess.toISOString(),
                        downTimeMinutes,
                      }),
                      updatedAt: now,
                    },
                  });
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error running IMAP health check:', isError(error) ? error : String(error));
      }
    });
    activeSchedulers['imap'] = task;
    logger.info('IMAP health check scheduler started successfully');
  } catch (error) {
    logger.error('Failed to start IMAP health check scheduler:', isError(error) ? error : String(error));
  }
}
/**
 * Stop the IMAP health check scheduler
 */
export function stopImapHealthCheck(): void {
  if (!activeSchedulers['imap']) {
    logger.info('IMAP health check scheduler not running');
    return;
  }
  logger.info('Stopping IMAP health check scheduler');
  try {
    activeSchedulers['imap'].stop();
    delete activeSchedulers['imap'];
    logger.info('IMAP health check scheduler stopped successfully');
  } catch (error) {
    logger.error('Error stopping IMAP health check scheduler:', isError(error) ? error : String(error));
  }
}
/**
 * Start all health check schedulers
 */
export function startAllHealthChecks(): void {
  logger.info('Starting all health check schedulers');
  startImapHealthCheck();
  // Add more health checks here as needed
}
/**
 * Stop all health check schedulers
 */
export function stopAllHealthChecks(): void {
  logger.info('Stopping all health check schedulers');
  Object.entries(activeSchedulers).forEach(([name, task]) => {
    logger.info(`Stopping ${name} health check scheduler`);
    task.stop();
    delete activeSchedulers[name];
  });
  logger.info('All health check schedulers stopped');
}
