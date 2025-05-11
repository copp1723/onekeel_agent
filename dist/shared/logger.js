/**
 * Logger Module
 *
 * This module provides centralized logging functionality for the application.
 * It supports different log levels and can log to both console and files.
 */
import fs from 'fs';
import path from 'path';
// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
// Log file paths
const generalLogPath = path.join(logsDir, 'general.log');
const insightRunsLogPath = path.join(logsDir, 'insight_runs.log');
// Log levels
export var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (LogLevel = {}));
/**
 * Write to log file with timestamp
 * @param filePath - Path to the log file
 * @param level - Log level
 * @param message - Message to log
 * @param meta - Optional metadata to include
 */
function writeToLogFile(filePath, level, message, meta) {
    try {
        const timestamp = new Date().toISOString();
        const metaString = meta ? `\n${JSON.stringify(meta, null, 2)}` : '';
        const logEntry = `[${timestamp}] [${level}] ${message}${metaString}\n`;
        fs.appendFileSync(filePath, logEntry);
    }
    catch (error) {
        console.error('Failed to write to log file:', error);
    }
}
/**
 * General purpose logger for application events
 */
export const logger = {
    debug: (message, meta) => {
        console.debug(`[DEBUG] ${message}`);
        writeToLogFile(generalLogPath, LogLevel.DEBUG, message, meta);
    },
    info: (message, meta) => {
        console.info(`[INFO] ${message}`);
        writeToLogFile(generalLogPath, LogLevel.INFO, message, meta);
    },
    warn: (message, meta) => {
        console.warn(`[WARN] ${message}`);
        writeToLogFile(generalLogPath, LogLevel.WARN, message, meta);
    },
    error: (message, meta) => {
        console.error(`[ERROR] ${message}`);
        writeToLogFile(generalLogPath, LogLevel.ERROR, message, meta);
    }
};
/**
 * Log insight generation run details
 * @param data - Insight run log data
 */
export function logInsightRun(data) {
    // Add timestamp if not provided
    const logData = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
    };
    // Log to console
    console.info(`[INSIGHT RUN] Platform: ${logData.platform}, Intent: ${logData.promptIntent}, Version: ${logData.promptVersion}`);
    console.info(`[INSIGHT RUN] Duration: ${logData.durationMs}ms, File: ${logData.inputFile || 'direct content'}`);
    if (logData.error) {
        console.error(`[INSIGHT RUN] Error: ${logData.error}`);
    }
    else {
        console.info(`[INSIGHT RUN] Generated ${logData.outputSummary.length} insights`);
    }
    // Write to insight runs log file
    writeToLogFile(insightRunsLogPath, LogLevel.INFO, 'Insight Generation Run', logData);
}
/**
 * Get task logs from DB (placeholder for DB integration)
 * @param taskId - Task ID to retrieve logs for
 * @returns Array of log entries
 */
export async function getTaskLogs(taskId) {
    // This is a placeholder. In a real implementation, this would
    // fetch logs from a database or other persistent storage.
    return [`Task ${taskId} logs would be retrieved from DB`];
}
//# sourceMappingURL=logger.js.map