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
export declare function logTask({ userInput, tool, status, output, userId }: {
    userInput: string;
    tool: string;
    status: 'success' | 'error';
    output: any;
    userId?: string;
}): Promise<void>;
/**
 * Retrieves task logs, optionally filtered by user ID
 * @param userId - Optional user ID to filter logs
 * @returns Array of task logs, either from database or memory
 */
export declare function getTaskLogs(userId?: string): Promise<{
    id: string;
    userId: string | null;
    userInput: string;
    tool: string;
    status: string;
    output: unknown;
    createdAt: Date | null;
}[] | {
    userInput: string;
    tool: string;
    status: "success" | "error";
    output: any;
    userId?: string;
    timestamp: string;
}[]>;
