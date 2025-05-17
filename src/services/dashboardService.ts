/**
 * Dashboard Service
 * 
 * This service provides data for monitoring dashboards.
 * It retrieves health check data, error rates, and performance metrics.
 */
import { db } from '../shared/db.js';
import { healthChecks, healthLogs } from '../shared/schema.js';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { logger } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';

/**
 * Get system health summary
 * @returns Health summary data
 */
export async function getHealthSummary() {
  try {
    // Get latest health check for each component
    const latestChecks = await db
      .select()
      .from(healthChecks)
      .orderBy(desc(healthChecks.lastChecked));
    
    // Count checks by status
    const statusCounts = {
      ok: 0,
      warning: 0,
      error: 0,
      total: latestChecks.length,
    };
    
    // Calculate status counts
    for (const check of latestChecks) {
      if (check.status === 'ok') {
        statusCounts.ok++;
      } else if (check.status === 'warning') {
        statusCounts.warning++;
      } else if (check.status === 'error') {
        statusCounts.error++;
      }
    }
    
    // Calculate overall status
    let overallStatus = 'ok';
    if (statusCounts.error > 0) {
      overallStatus = 'error';
    } else if (statusCounts.warning > 0) {
      overallStatus = 'warning';
    }
    
    return {
      overallStatus,
      statusCounts,
      components: latestChecks,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Failed to get health summary:', isError(error) ? error : String(error));
    throw error;
  }
}

/**
 * Get error rate data for dashboard
 * @param timeRange Time range in hours (default: 24)
 * @returns Error rate data
 */
export async function getErrorRateData(timeRange: number = 24) {
  try {
    // Calculate start time
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - timeRange);
    
    // Get error logs
    const errorLogs = await db
      .select({
        timestamp: healthLogs.timestamp,
        status: healthLogs.status,
        checkId: healthLogs.checkId,
      })
      .from(healthLogs)
      .where(
        and(
          gte(healthLogs.timestamp, startTime),
          eq(healthLogs.status, 'error')
        )
      )
      .orderBy(healthLogs.timestamp);
    
    // Get total logs
    const totalLogsResult = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(healthLogs)
      .where(gte(healthLogs.timestamp, startTime));
    
    const totalLogs = totalLogsResult[0]?.count || 0;
    
    // Group errors by hour
    const errorsByHour: Record<string, number> = {};
    const totalByHour: Record<string, number> = {};
    
    // Initialize hours
    for (let i = 0; i < timeRange; i++) {
      const hour = new Date(startTime);
      hour.setHours(hour.getHours() + i);
      const hourKey = hour.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      errorsByHour[hourKey] = 0;
      totalByHour[hourKey] = 0;
    }
    
    // Count errors by hour
    for (const log of errorLogs) {
      const hourKey = log.timestamp.toISOString().substring(0, 13);
      errorsByHour[hourKey] = (errorsByHour[hourKey] || 0) + 1;
    }
    
    // Calculate error rates
    const errorRates = Object.keys(errorsByHour).map(hourKey => {
      const errorCount = errorsByHour[hourKey];
      const totalCount = totalByHour[hourKey] || 1; // Avoid division by zero
      const rate = errorCount / totalCount;
      
      return {
        hour: hourKey,
        errorCount,
        totalCount,
        rate,
      };
    });
    
    return {
      errorRate: errorLogs.length / (totalLogs || 1),
      totalErrors: errorLogs.length,
      totalLogs,
      errorRates,
      timeRange,
    };
  } catch (error) {
    logger.error('Failed to get error rate data:', isError(error) ? error : String(error));
    throw error;
  }
}

/**
 * Get performance metrics for dashboard
 * @param timeRange Time range in hours (default: 24)
 * @returns Performance metrics data
 */
export async function getPerformanceMetrics(timeRange: number = 24) {
  try {
    // Calculate start time
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - timeRange);
    
    // Get health logs with response times
    const performanceLogs = await db
      .select({
        timestamp: healthLogs.timestamp,
        responseTime: healthLogs.responseTime,
        checkId: healthLogs.checkId,
      })
      .from(healthLogs)
      .where(gte(healthLogs.timestamp, startTime))
      .orderBy(healthLogs.timestamp);
    
    // Group by component
    const componentResponseTimes: Record<string, number[]> = {};
    
    for (const log of performanceLogs) {
      if (!componentResponseTimes[log.checkId]) {
        componentResponseTimes[log.checkId] = [];
      }
      
      componentResponseTimes[log.checkId].push(log.responseTime);
    }
    
    // Calculate statistics for each component
    const componentStats = Object.keys(componentResponseTimes).map(componentId => {
      const responseTimes = componentResponseTimes[componentId];
      const count = responseTimes.length;
      const sum = responseTimes.reduce((acc, val) => acc + val, 0);
      const avg = sum / count;
      
      // Sort for percentiles
      responseTimes.sort((a, b) => a - b);
      
      const p50 = responseTimes[Math.floor(count * 0.5)];
      const p90 = responseTimes[Math.floor(count * 0.9)];
      const p99 = responseTimes[Math.floor(count * 0.99)];
      
      return {
        componentId,
        count,
        avg,
        min: responseTimes[0],
        max: responseTimes[count - 1],
        p50,
        p90,
        p99,
      };
    });
    
    return {
      components: componentStats,
      timeRange,
    };
  } catch (error) {
    logger.error('Failed to get performance metrics:', isError(error) ? error : String(error));
    throw error;
  }
}

/**
 * Get database query performance metrics
 * @param timeRange Time range in hours (default: 24)
 * @returns Database performance metrics
 */
export async function getDatabasePerformanceMetrics(timeRange: number = 24) {
  try {
    // This is a placeholder for actual database performance metrics
    // In a real implementation, you would query a table that stores query performance data
    
    return {
      message: 'Database performance metrics not implemented yet',
      timeRange,
    };
  } catch (error) {
    logger.error('Failed to get database performance metrics:', isError(error) ? error : String(error));
    throw error;
  }
}

export default {
  getHealthSummary,
  getErrorRateData,
  getPerformanceMetrics,
  getDatabasePerformanceMetrics,
};
