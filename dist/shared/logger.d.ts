/**
 * Logger Module
 *
 * This module provides centralized logging functionality for the application.
 * It supports different log levels and can log to both console and files.
 */
export declare enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR"
}
/**
 * General purpose logger for application events
 */
export declare const logger: {
    debug: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
};
/**
 * Specialized logger for insight generation runs
 */
export interface InsightRunLogData {
    platform: string;
    inputFile?: string;
    promptIntent: string;
    promptVersion: string;
    durationMs: number;
    outputSummary: string[];
    error?: string;
    timestamp?: string;
}
/**
 * Log insight generation run details
 * @param data - Insight run log data
 */
export declare function logInsightRun(data: InsightRunLogData): void;
/**
 * Get task logs from DB (placeholder for DB integration)
 * @param taskId - Task ID to retrieve logs for
 * @returns Array of log entries
 */
export declare function getTaskLogs(taskId: string): Promise<string[]>;
