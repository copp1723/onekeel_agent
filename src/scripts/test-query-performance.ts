/**
 * Query Performance Testing Script
 * 
 * This script tests the performance of database queries before and after optimization.
 */
import { db } from '../shared/db.js.js';
import { sql } from 'drizzle-orm';
import {  
  taskLogs, 
  workflows, 
  emailQueue } from '....js';
import { eq, desc, asc } from 'drizzle-orm';
import { 
  getRecentTaskLogs, 
  getTaskLogsByStatus, 
  getActiveWorkflows, 
  getPendingEmails 
} from '../services/queryOptimizer.js.js';
import { clearCache } from '../services/dbOptimizationService.js.js';
/**
 * Measure the execution time of a function
 * 
 * @param fn - Function to measure
 * @param label - Label for the measurement
 * @returns Result of the function
 */
async function measureExecutionTime<T>(fn: () => Promise<T>, label: string): Promise<T> {
  console.time(label);
  const result = await fn();
  console.timeEnd(label);
  return result;
}
/**
 * Test query performance
 */
async function testQueryPerformance() {
  console.log('Testing query performance...');
  try {
    // Clear cache to ensure fair comparison
    clearCache();
    // Test unoptimized queries
    console.log('\n--- Unoptimized Queries ---');
    // Recent task logs
    await measureExecutionTime(async () => {
      return await db.select()
        .from(taskLogs)
        .orderBy(desc(taskLogs.createdAt))
        .limit(100);
    }, { direction: 'Unoptimized: Recent task logs' });
    // Task logs by status
    await measureExecutionTime(async () => {
      return await db.select()
        .from(taskLogs)
        .where(eq(taskLogs.status, 'completed'))
        .orderBy(desc(taskLogs.createdAt))
        .limit(100);
    }, { direction: 'Unoptimized: Task logs by status' });
    // Active workflows
    await measureExecutionTime(async () => {
      return await db.select()
        .from(workflows)
        .where(eq(workflows.status, 'running'))
        .orderBy(desc(workflows.createdAt))
        .limit(100);
    }, { direction: 'Unoptimized: Active workflows' });
    // Pending emails
    await measureExecutionTime(async () => {
      return await db.select()
        .from(emailQueue)
        .where(eq(emailQueue.status, 'pending'))
        .orderBy(asc(emailQueue.createdAt))
        .limit(100);
    }, { direction: 'Unoptimized: Pending emails' });
    // Test optimized queries
    console.log('\n--- Optimized Queries (First Run) ---');
    // Recent task logs
    await measureExecutionTime(async () => {
      return await getRecentTaskLogs(100, { bypass: true });
    }, 'Optimized: Recent task logs (no cache)');
    // Task logs by status
    await measureExecutionTime(async () => {
      return await getTaskLogsByStatus('completed', 100, { bypass: true });
    }, 'Optimized: Task logs by status (no cache)');
    // Active workflows
    await measureExecutionTime(async () => {
      return await getActiveWorkflows(100, { bypass: true });
    }, 'Optimized: Active workflows (no cache)');
    // Pending emails
    await measureExecutionTime(async () => {
      return await getPendingEmails(100, { bypass: true });
    }, 'Optimized: Pending emails (no cache)');
    // Test cached queries
    console.log('\n--- Optimized Queries (Cached) ---');
    // Recent task logs
    await measureExecutionTime(async () => {
      return await getRecentTaskLogs();
    }, 'Optimized: Recent task logs (cached)');
    // Task logs by status
    await measureExecutionTime(async () => {
      return await getTaskLogsByStatus('completed');
    }, 'Optimized: Task logs by status (cached)');
    // Active workflows
    await measureExecutionTime(async () => {
      return await getActiveWorkflows();
    }, 'Optimized: Active workflows (cached)');
    // Pending emails
    await measureExecutionTime(async () => {
      return await getPendingEmails();
    }, 'Optimized: Pending emails (cached)');
    console.log('\nQuery performance testing completed!');
  } catch (error) {
    console.error('Error testing query performance:', error);
  } finally {
    // Close the database connection
    await db.execute(sql.raw('SELECT 1'));
    process.exit(0);
  }
}
// Run the performance test
testQueryPerformance().catch(console.error);
