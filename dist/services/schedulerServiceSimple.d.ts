/**
 * Simple Scheduler Service
 * A simplified version of the scheduler without node-cron dependency.
 * Uses setInterval for basic periodic scheduling.
 */
export interface Schedule {
    id: string;
    workflowId: string | null;
    cron: string;
    enabled: boolean;
    description?: string;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
    lastRunAt?: Date | null;
    nextRunAt?: Date | null;
    userId?: string;
}
/**
 * Initialize the scheduler on application startup
 * Loads all enabled schedules from the database and starts them
 */
export declare function initializeScheduler(): Promise<void>;
/**
 * Create a new schedule for a workflow
 */
export declare function createSchedule(workflowId: string, cronExpression: string, options?: {
    enabled?: boolean;
    description?: string;
    tags?: string[];
    userId?: string;
}): Promise<Schedule>;
/**
 * Start a schedule
 */
export declare function startSchedule(schedule: Schedule): Promise<void>;
/**
 * Stop a schedule
 */
export declare function stopSchedule(scheduleId: string): Promise<void>;
/**
 * Execute a scheduled workflow directly (called by job processor)
 */
export declare function executeWorkflowById(workflowId: string): Promise<void>;
/**
 * Get a schedule by ID
 */
export declare function getSchedule(scheduleId: string): Promise<Schedule | undefined>;
/**
 * List all schedules
 */
export declare function listSchedules(): Promise<Schedule[]>;
/**
 * Update a schedule
 */
export declare function updateSchedule(scheduleId: string, updates: {
    cronExpression?: string;
    enabled?: boolean;
    description?: string;
    tags?: string[];
}): Promise<Schedule>;
/**
 * Delete a schedule
 */
export declare function deleteSchedule(scheduleId: string): Promise<boolean>;
