/**
 * DataDog Integration Service
 * 
 * This service provides integration with DataDog for performance monitoring and metrics.
 * It configures the DataDog tracer, sets up custom metrics, and provides utility functions
 * for tracking performance data.
 */
import tracer from 'dd-trace';
import { metrics } from 'datadog-metrics';
import { logger } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';

// Environment-specific configuration
const DD_ENV = process.env.NODE_ENV || 'development';
const DD_SERVICE = process.env.DD_SERVICE || 'agentflow';
const DD_VERSION = process.env.npm_package_version || '0.0.0';

// Metric collection interval (seconds)
const METRIC_COLLECTION_INTERVAL = process.env.DD_METRIC_INTERVAL 
  ? parseInt(process.env.DD_METRIC_INTERVAL, 10) 
  : 10;

/**
 * Initialize DataDog tracer
 * @returns true if DataDog was initialized successfully, false otherwise
 */
export function initializeDataDog(): boolean {
  try {
    // Check if DataDog API key is configured
    if (!process.env.DD_API_KEY) {
      logger.warn('DataDog API key not provided, performance monitoring disabled');
      return false;
    }
    
    // Initialize the tracer
    tracer.init({
      service: DD_SERVICE,
      env: DD_ENV,
      version: DD_VERSION,
      logInjection: true,
      analytics: true,
      runtimeMetrics: true,
    });
    
    // Initialize metrics
    metrics.init({
      host: process.env.DD_AGENT_HOST || 'localhost',
      prefix: `${DD_SERVICE}.`,
      defaultTags: [`env:${DD_ENV}`, `service:${DD_SERVICE}`, `version:${DD_VERSION}`],
      flushIntervalSeconds: METRIC_COLLECTION_INTERVAL,
    });
    
    logger.info('DataDog initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize DataDog:', isError(error) ? error : String(error));
    return false;
  }
}

/**
 * Track a custom metric in DataDog
 * @param name Metric name
 * @param value Metric value
 * @param tags Additional tags
 */
export function trackMetric(
  name: string, 
  value: number, 
  tags: string[] = []
): void {
  try {
    metrics.gauge(name, value, tags);
  } catch (error) {
    logger.error(`Failed to track metric ${name}:`, isError(error) ? error : String(error));
  }
}

/**
 * Increment a counter metric in DataDog
 * @param name Metric name
 * @param increment Amount to increment (default: 1)
 * @param tags Additional tags
 */
export function incrementMetric(
  name: string, 
  increment: number = 1, 
  tags: string[] = []
): void {
  try {
    metrics.increment(name, increment, tags);
  } catch (error) {
    logger.error(`Failed to increment metric ${name}:`, isError(error) ? error : String(error));
  }
}

/**
 * Track a histogram metric in DataDog
 * @param name Metric name
 * @param value Metric value
 * @param tags Additional tags
 */
export function trackHistogram(
  name: string, 
  value: number, 
  tags: string[] = []
): void {
  try {
    metrics.histogram(name, value, tags);
  } catch (error) {
    logger.error(`Failed to track histogram ${name}:`, isError(error) ? error : String(error));
  }
}

/**
 * Track database query performance
 * @param operation Query operation (e.g., 'select', 'insert')
 * @param table Table name
 * @param durationMs Duration in milliseconds
 * @param success Whether the query was successful
 */
export function trackDatabaseQuery(
  operation: string,
  table: string,
  durationMs: number,
  success: boolean = true
): void {
  try {
    const tags = [
      `operation:${operation}`,
      `table:${table}`,
      `success:${success}`,
    ];
    
    // Track query duration
    trackHistogram('database.query.duration', durationMs, tags);
    
    // Increment query count
    incrementMetric('database.query.count', 1, tags);
  } catch (error) {
    logger.error('Failed to track database query:', isError(error) ? error : String(error));
  }
}

/**
 * Track API endpoint performance
 * @param method HTTP method
 * @param path API path
 * @param statusCode HTTP status code
 * @param durationMs Duration in milliseconds
 */
export function trackApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void {
  try {
    const tags = [
      `method:${method}`,
      `path:${path}`,
      `status_code:${statusCode}`,
      `status_category:${Math.floor(statusCode / 100)}xx`,
    ];
    
    // Track request duration
    trackHistogram('api.request.duration', durationMs, tags);
    
    // Increment request count
    incrementMetric('api.request.count', 1, tags);
  } catch (error) {
    logger.error('Failed to track API request:', isError(error) ? error : String(error));
  }
}

/**
 * Track system resource usage
 */
export function trackSystemResources(): void {
  try {
    const memoryUsage = process.memoryUsage();
    
    // Track memory usage
    trackMetric('system.memory.rss', memoryUsage.rss / 1024 / 1024, ['unit:MB']); // RSS in MB
    trackMetric('system.memory.heapTotal', memoryUsage.heapTotal / 1024 / 1024, ['unit:MB']); // Heap total in MB
    trackMetric('system.memory.heapUsed', memoryUsage.heapUsed / 1024 / 1024, ['unit:MB']); // Heap used in MB
    
    // Track CPU usage (this is approximate)
    const cpuUsage = process.cpuUsage();
    trackMetric('system.cpu.user', cpuUsage.user / 1000, ['unit:ms']); // User CPU time in ms
    trackMetric('system.cpu.system', cpuUsage.system / 1000, ['unit:ms']); // System CPU time in ms
  } catch (error) {
    logger.error('Failed to track system resources:', isError(error) ? error : String(error));
  }
}

/**
 * Flush metrics before shutting down
 */
export async function flushMetrics(): Promise<void> {
  try {
    await new Promise<void>((resolve) => {
      metrics.flush(() => resolve());
    });
    logger.info('DataDog metrics flushed successfully');
  } catch (error) {
    logger.error('Error flushing DataDog metrics:', isError(error) ? error : String(error));
  }
}

export default {
  initializeDataDog,
  trackMetric,
  incrementMetric,
  trackHistogram,
  trackDatabaseQuery,
  trackApiRequest,
  trackSystemResources,
  flushMetrics,
};
