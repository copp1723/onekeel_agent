/**
 * Health Monitoring Service
 *
 * This service provides functionality to monitor the health and performance
 * of various components in the system. It periodically checks the status
 * of different services and APIs, and stores the results for display
 * in a health dashboard.
 */
export interface HealthCheckResult {
    id: string;
    name: string;
    status: 'ok' | 'warning' | 'error';
    responseTime: number;
    lastChecked: Date;
    message?: string;
    details?: Record<string, any>;
}
export interface HealthLogEntry {
    id: string;
    checkId: string;
    timestamp: Date;
    status: 'ok' | 'warning' | 'error';
    responseTime: number;
    message?: string;
    details?: Record<string, any>;
}
/**
 * Register a new health check function
 * @param name - The name of the health check
 * @param checkFn - The function that performs the health check
 */
export declare function registerHealthCheck(name: string, checkFn: () => Promise<HealthCheckResult>): void;
/**
 * Run all registered health checks
 * @returns Results of all health checks
 */
export declare function runAllHealthChecks(): Promise<HealthCheckResult[]>;
/**
 * Run a specific health check by name
 * @param name - The name of the health check to run
 * @returns Result of the health check
 */
export declare function runHealthCheck(name: string): Promise<HealthCheckResult | null>;
/**
 * Get the most recent health check results
 * @returns List of the latest health check results for each service
 */
export declare function getLatestHealthChecks(): Promise<HealthCheckResult[]>;
/**
 * Get health logs for a specific check
 * @param checkId - ID of the health check
 * @param limit - Maximum number of logs to return
 * @returns List of health log entries
 */
export declare function getHealthLogs(checkId: string, limit?: number): Promise<HealthLogEntry[]>;
/**
 * Get a summary of system health
 * @returns Summary of the system health status
 */
export declare function getHealthSummary(): Promise<{
    overallStatus: 'ok' | 'warning' | 'error';
    servicesCount: number;
    servicesOk: number;
    servicesWarning: number;
    servicesError: number;
    averageResponseTime: number;
    lastChecked: Date | null;
}>;
/**
 * Default health check for the database
 */
export declare function checkDatabaseHealth(): Promise<HealthCheckResult>;
/**
 * Health check for the email service
 */
export declare function checkEmailService(): Promise<HealthCheckResult>;
/**
 * Health check for the AI API (OpenAI)
 */
export declare function checkAIService(): Promise<HealthCheckResult>;
/**
 * Health check for the scheduler service
 */
export declare function checkSchedulerService(): Promise<HealthCheckResult>;
