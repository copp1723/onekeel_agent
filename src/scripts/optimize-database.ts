/**
 * Database Optimization Script
 *
 * This script optimizes the database by adding indexes and analyzing tables.
 */
import { db } from '../shared/db.js';
import { sql } from 'drizzle-orm';
import {
  createIndexIfNotExists,
  optimizeTable,
  getDatabaseStats,
} from '../services/dbOptimizationService.js';
/**
 * Main function to optimize the database
 */
async function optimizeDatabase() {
  console.log('Starting database optimization...');
  try {
    // Get initial database stats
    console.log('Getting initial database statistics...');
    const initialStats = await getDatabaseStats();
    console.log('Initial table statistics:');
    console.table(initialStats.tables);
    // Add indexes to frequently queried tables
    console.log('\nAdding indexes to frequently queried tables...');
    // Task logs indexes
    await createIndexIfNotExists('task_logs', 'idx_task_logs_created_at', ['created_at']);
    await createIndexIfNotExists('task_logs', 'idx_task_logs_status_created_at', [
      'status',
      'created_at',
    ]);
    await createIndexIfNotExists('task_logs', 'idx_task_logs_task_type', ['task_type']);
    // Workflows indexes
    await createIndexIfNotExists('workflows', 'idx_workflows_status_created_at', [
      'status',
      'created_at',
    ]);
    await createIndexIfNotExists('workflows', 'idx_workflows_user_id_status', [
      'user_id',
      'status',
    ]);
    // Email queue indexes
    await createIndexIfNotExists('email_queue', 'idx_email_queue_status_created_at', [
      'status',
      'created_at',
    ]);
    await createIndexIfNotExists('email_queue', 'idx_email_queue_process_after', ['process_after']);
    // Email logs indexes
    await createIndexIfNotExists('email_logs', 'idx_email_logs_created_at', ['created_at']);
    await createIndexIfNotExists('email_logs', 'idx_email_logs_recipient_email', [
      'recipient_email',
    ]);
    // Health checks indexes
    await createIndexIfNotExists('health_checks', 'idx_health_checks_last_checked', [
      'last_checked',
    ]);
    // Health logs indexes
    await createIndexIfNotExists('health_logs', 'idx_health_logs_check_id_timestamp', [
      'check_id',
      'timestamp',
    ]);
    // Dealer credentials indexes
    await createIndexIfNotExists(
      'dealer_credentials',
      'idx_dealer_credentials_dealer_id_platform',
      ['dealer_id', 'platform']
    );
    // Analyze tables to update statistics
    console.log('\nAnalyzing tables to update statistics...');
    await optimizeTable('task_logs');
    await optimizeTable('workflows');
    await optimizeTable('email_queue');
    await optimizeTable('email_logs');
    await optimizeTable('health_checks');
    await optimizeTable('health_logs');
    await optimizeTable('dealer_credentials');
    // Get final database stats
    console.log('\nGetting final database statistics...');
    const finalStats = await getDatabaseStats();
    console.log('Final table statistics:');
    console.table(finalStats.tables);
    console.log('\nIndex statistics:');
    console.table(finalStats.indexes);
    console.log('\nCache hit ratio:');
    console.table([finalStats.cacheHitRatio]);
    console.log('\nDatabase optimization completed successfully!');
  } catch (error) {
    console.error('Error optimizing database:', error);
  } finally {
    // Close the database connection
    await db.execute(sql.raw('SELECT 1'));
    process.exit(0);
  }
}
// Run the optimization
optimizeDatabase().catch(console.error);
