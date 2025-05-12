declare let jobQueue: any;
export { jobQueue };
type InMemoryJob = {
    id: string;
    taskId: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    lastError?: string;
    data: any;
    createdAt: Date;
    updatedAt: Date;
    nextRunAt: Date;
    lastRunAt?: Date;
};
export declare function initializeJobQueue(): Promise<void>;
/**
 * Add a new job to the queue
 */
export declare function enqueueJob(taskId: string, priority?: number): Promise<string>;
/**
 * Get job by ID
 */
export declare function getJobById(jobId: string): Promise<InMemoryJob | {
    id: string;
    taskId: string | null;
    status: string;
    attempts: number;
    maxAttempts: number;
    lastError: string | null;
    nextRunAt: Date;
    lastRunAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
} | null | undefined>;
/**
 * Update job status
 */
export declare function updateJobStatus(jobId: string, status: string, error?: string): Promise<void>;
/**
 * Update job for retry
 */
export declare function updateJobForRetry(jobId: string, error: string, nextRunAt: Date): Promise<void>;
/**
 * List all jobs with optional filtering
 */
export declare function listJobs(status?: string, limit?: number): Promise<InMemoryJob[] | {
    id: string;
    taskId: string | null;
    status: string;
    attempts: number;
    maxAttempts: number;
    lastError: string | null;
    nextRunAt: Date;
    lastRunAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}[]>;
/**
 * Manually retry a failed job
 */
export declare function retryJob(jobId: string): Promise<boolean>;
export declare function shutdown(): Promise<void>;
