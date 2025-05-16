export interface Schedule {
  id: string;
  workflowId: string;
  cron: string;
  lastRunAt?: Date;
  enabled: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface ScheduleOptions {
  description?: string;
  enabled?: boolean;
}
export interface ScheduleUpdate {
  cronExpression?: string;
  enabled?: boolean;
  description?: string;
}
export interface ScheduleLog {
  id: string;
  scheduleId: string;
  workflowId: string;
  status: 'success' | 'failed';
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}
export interface SchedulerConfig {
  retryLimit: number;
  retryDelay: number;
  useNodemailerFallback: boolean;
}
export interface TimerInfo {
  timer: NodeJS.Timer;
  workflowId: string;
  cron: string;
  lastRun?: Date;
}
