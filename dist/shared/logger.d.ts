/**
 * Logs a task execution to the database
 *
 * @param params - The logging parameters
 * @param params.userInput - The original user input/task description
 * @param params.tool - The tool used to execute the task
 * @param params.status - The execution status ('success' or 'error')
 * @param params.output - The task output or error information
 * @returns Promise that resolves when the log entry is created
 */
export declare function logTask({ userInput, tool, status, output }: {
    userInput: string;
    tool: string;
    status: 'success' | 'error';
    output: any;
}): Promise<void>;
/**
 * Retrieves all task logs (from memory if database not available)
 */
export declare function getTaskLogs(): Promise<{
    userInput: string;
    tool: string;
    status: "success" | "error";
    output: any;
    timestamp: string;
}[] | {
    id: string;
    userInput: string;
    tool: string;
    status: string;
    output: unknown;
    createdAt: Date;
}[]>;
