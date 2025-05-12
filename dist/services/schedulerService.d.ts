/**
 * Scheduler Service
 * Manages and executes scheduled workflows based on cron expressions
 */
import { type Schedule } from '../shared/schema.js';
/**
 * Initialize the scheduler on application startup
 * Loads all enabled schedules from the database and starts them
 */
export declare function initializeScheduler(): Promise<void>;
/**
 * Create a new schedule for a workflow
 */
export declare function createSchedule(workflowId: string, cronExpression: string, enabled?: boolean): Promise<Schedule>;
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
}): Promise<Schedule | undefined>;
/**
 * Delete a schedule
 */
export declare function deleteSchedule(scheduleId: string): Promise<boolean>;
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
