import { db } from './db.js';
import { taskLogs } from './schema.js';

// In-memory fallback storage for when DB is not available
const memoryLogs: Array<{
  userInput: string;
  tool: string;
  status: 'success' | 'error';
  output: any;
  timestamp: string;
}> = [];

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
export async function logTask({ 
  userInput, 
  tool, 
  status, 
  output 
}: { 
  userInput: string; 
  tool: string; 
  status: 'success' | 'error'; 
  output: any;
}) {
  // Always log to memory first as a fallback
  memoryLogs.push({
    userInput,
    tool,
    status,
    output,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Then try to log to database
    await db.insert(taskLogs).values({
      userInput,
      tool,
      status,
      output,
    });
    
    console.log(`Task logged to database: ${tool} - ${status}`);
  } catch (error) {
    // Don't throw here to avoid breaking the main flow if logging fails
    console.error('Failed to log task to database:', error);
    console.log('Task was logged to memory instead');
  }
}

/**
 * Retrieves all task logs (from memory if database not available)
 */
export async function getTaskLogs() {
  try {
    // Try database first
    const dbLogs = await db.select().from(taskLogs);
    return dbLogs;
  } catch (error) {
    console.error('Failed to retrieve logs from database:', error);
    // Fall back to memory logs
    return memoryLogs;
  }
}