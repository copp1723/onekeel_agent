import { db } from './db.js';
import { updatedTaskLogs as taskLogs } from './schema.js';
import { eq } from 'drizzle-orm';
// In-memory fallback storage for when DB is not available
const memoryLogs = [];
/**
 * Logs a task execution to the database
 *
 * @param params - The logging parameters
 * @param params.userInput - The original user input/task description
 * @param params.tool - The tool used to execute the task
 * @param params.status - The execution status ('success' or 'error')
 * @param params.output - The task output or error information
 * @param params.userId - Optional user ID for authenticated tasks
 * @returns Promise that resolves when the log entry is created
 */
export async function logTask({ userInput, tool, status, output, userId }) {
    // Always log to memory first as a fallback
    memoryLogs.push({
        userInput,
        tool,
        status,
        output,
        userId,
        timestamp: new Date().toISOString()
    });
    try {
        // Then try to log to database
        // First attempt with userId (for upgraded schema)
        try {
            await db.insert(taskLogs).values({
                userInput,
                tool,
                status,
                output,
                userId
            });
            console.log(`Task logged to database: ${tool} - ${status}`);
        }
        catch (error) {
            // If that fails, try without userId (for original schema)
            if (error.message && error.message.includes('user_id')) {
                console.log('Falling back to schema without user_id');
                await db.insert(taskLogs).values({
                    userInput,
                    tool,
                    status,
                    output
                });
                console.log(`Task logged to database (without userId): ${tool} - ${status}`);
            }
            else {
                // Re-throw if it's not a user_id related issue
                throw error;
            }
        }
    }
    catch (error) {
        // Don't throw here to avoid breaking the main flow if logging fails
        console.error('Failed to log task to database:', error);
        console.log('Task was logged to memory instead');
    }
}
/**
 * Retrieves task logs, optionally filtered by user ID
 * @param userId - Optional user ID to filter logs
 * @returns Array of task logs, either from database or memory
 */
export async function getTaskLogs(userId) {
    try {
        // Try database first
        let query = db.select().from(taskLogs);
        // Add userId filter if provided, but handle if user_id column doesn't exist
        if (userId) {
            try {
                query = query.where(eq(taskLogs.userId, userId));
                const dbLogs = await query;
                return dbLogs;
            }
            catch (error) {
                // If user_id column doesn't exist, retrieve all logs
                if (error.message && error.message.includes('user_id')) {
                    console.log('Column user_id not found, retrieving all logs');
                    return await db.select().from(taskLogs);
                }
                throw error;
            }
        }
        else {
            // No user ID filter needed
            const dbLogs = await query;
            return dbLogs;
        }
    }
    catch (error) {
        console.error('Failed to retrieve logs from database:', error);
        // Fall back to memory logs, filtering by userId if provided
        if (userId) {
            return memoryLogs.filter(log => log.userId === userId);
        }
        return memoryLogs;
    }
}
//# sourceMappingURL=logger.js.map