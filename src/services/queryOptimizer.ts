/**
 * Query Optimizer Service
 * 
 * Service for optimizing specific database queries.
 */
import { db } from '../shared/db.js.js';
import { executeWithCache, CacheOptions } from './dbOptimizationService.js.js';
import {  
  taskLogs, 
  workflows, 
  emailQueue, 
  emailLogs, 
  healthChecks, 
  dealerCredentials 
 } from '....js';
import {    eq, and, or, desc, asc } from '....js';
/**
 * Get recent task logs with caching
 * 
 * @param limit - Maximum number of logs to return
 * @param options - Cache options
 * @returns Recent task logs
 */
export async function getRecentTaskLogs(
  limit: number = 100,
  options: CacheOptions = {}
) {
  return executeWithCache(
    async () => {
      return await db.select()
        .from(taskLogs)
        .orderBy(desc(taskLogs.createdAt))
        .limit(limit);
    },
    {
      key: `recent_task_logs_${limit}`,
      ttl: 60, // 1 minute TTL
      ...options
    }
  );
}
/**
 * Get task logs by status with caching
 * 
 * @param status - Status to filter by
 * @param limit - Maximum number of logs to return
 * @param options - Cache options
 * @returns Task logs with the specified status
 */
export async function getTaskLogsByStatus(
  status: string,
  limit: number = 100,
  options: CacheOptions = {}
) {
  return executeWithCache(
    async () => {
      return await db.select()
        .from(taskLogs)
        .where(eq(taskLogs.status, status))
        .orderBy(desc(taskLogs.createdAt))
        .limit(limit);
    },
    {
      key: `task_logs_status_${status}_${limit}`,
      ttl: 60, // 1 minute TTL
      ...options
    }
  );
}
/**
 * Get task logs by user with caching
 * 
 * @param userId - User ID to filter by
 * @param limit - Maximum number of logs to return
 * @param options - Cache options
 * @returns Task logs for the specified user
 */
export async function getTaskLogsByUser(
  userId: string,
  limit: number = 100,
  options: CacheOptions = {}
) {
  return executeWithCache(
    async () => {
      return await db.select()
        .from(taskLogs)
        .where(eq(taskLogs.userId!, userId))
        .orderBy(desc(taskLogs.createdAt))
        .limit(limit);
    },
    {
      key: `task_logs_user_${userId}_${limit}`,
      ttl: 300, // 5 minutes TTL
      ...options
    }
  );
}
/**
 * Get active workflows with caching
 * 
 * @param limit - Maximum number of workflows to return
 * @param options - Cache options
 * @returns Active workflows
 */
export async function getActiveWorkflows(
  limit: number = 100,
  options: CacheOptions = {}
) {
  return executeWithCache(
    async () => {
      return await db.select()
        .from(workflows)
        .where(
          or(
            eq(workflows.status, 'pending'),
            eq(workflows.status, 'running')
          )
        )
        .orderBy(desc(workflows.createdAt))
        .limit(limit);
    },
    {
      key: `active_workflows_${limit}`,
      ttl: 30, // 30 seconds TTL
      ...options
    }
  );
}
/**
 * Get workflows by user with caching
 * 
 * @param userId - User ID to filter by
 * @param limit - Maximum number of workflows to return
 * @param options - Cache options
 * @returns Workflows for the specified user
 */
export async function getWorkflowsByUser(
  userId: string,
  limit: number = 100,
  options: CacheOptions = {}
) {
  return executeWithCache(
    async () => {
      return await db.select()
        .from(workflows)
        .where(eq(workflows.userId!, userId))
        .orderBy(desc(workflows.createdAt))
        .limit(limit);
    },
    {
      key: `workflows_user_${userId}_${limit}`,
      ttl: 300, // 5 minutes TTL
      ...options
    }
  );
}
/**
 * Get pending emails with caching
 * 
 * @param limit - Maximum number of emails to return
 * @param options - Cache options
 * @returns Pending emails
 */
export async function getPendingEmails(
  limit: number = 100,
  options: CacheOptions = {}
) {
  return executeWithCache(
    async () => {
      return await db.select()
        .from(emailQueue)
        .where(eq(emailQueue.status, 'pending'))
        .orderBy(asc(emailQueue.createdAt))
        .limit(limit);
    },
    {
      key: `pending_emails_${limit}`,
      ttl: 30, // 30 seconds TTL
      ...options
    }
  );
}
/**
 * Get email logs by recipient with caching
 * 
 * @param recipientEmail - Recipient email to filter by
 * @param limit - Maximum number of logs to return
 * @param options - Cache options
 * @returns Email logs for the specified recipient
 */
export async function getEmailLogsByRecipient(
  recipientEmail: string,
  limit: number = 100,
  options: CacheOptions = {}
) {
  return executeWithCache(
    async () => {
      return await db.select()
        .from(emailLogs)
        .where(eq(emailLogs.recipientEmail, recipientEmail))
        .orderBy(desc(emailLogs.createdAt))
        .limit(limit);
    },
    {
      key: `email_logs_recipient_${recipientEmail}_${limit}`,
      ttl: 300, // 5 minutes TTL
      ...options
    }
  );
}
/**
 * Get health check status with caching
 * 
 * @param options - Cache options
 * @returns Health check status
 */
export async function getHealthCheckStatus(options: CacheOptions = {}) {
  return executeWithCache(
    async () => {
      return await db.select()
        .from(healthChecks)
        .orderBy(desc(healthChecks.lastChecked));
    },
    {
      key: 'health_check_status',
      ttl: 60, // 1 minute TTL
      ...options
    }
  );
}
/**
 * Get dealer credentials by dealer ID with caching
 * 
 * @param dealerId - Dealer ID to filter by
 * @param options - Cache options
 * @returns Dealer credentials for the specified dealer
 */
export async function getDealerCredentialsByDealerId(
  dealerId: string,
  options: CacheOptions = {}
) {
  return executeWithCache(
    async () => {
      return await db.select()
        .from(dealerCredentials)
        .where(
          and(
            eq(dealerCredentials.dealerId!, dealerId),
            eq(dealerCredentials.active, true)
          )
        );
    },
    {
      key: `dealer_credentials_${dealerId}`,
      ttl: 3600, // 1 hour TTL
      ...options
    }
  );
}
