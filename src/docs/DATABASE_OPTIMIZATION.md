# Database Optimization Guide

## Overview

This guide documents the database optimization patterns implemented in the AgentFlow project to improve query performance and reduce database load.

## Optimization Techniques

### 1. Indexing

Indexes have been added to frequently queried columns to speed up data retrieval:

#### Task Logs Table
- `idx_task_logs_created_at` - Index on `created_at` for chronological queries
- `idx_task_logs_status_created_at` - Composite index on `status` and `created_at` for filtered chronological queries
- `idx_task_logs_task_type` - Index on `task_type` for filtering by task type

#### Workflows Table
- `idx_workflows_status_created_at` - Composite index on `status` and `created_at` for filtered chronological queries
- `idx_workflows_user_id_status` - Composite index on `user_id` and `status` for user-specific workflow queries

#### Email Queue Table
- `idx_email_queue_status_created_at` - Composite index on `status` and `created_at` for filtered chronological queries
- `idx_email_queue_process_after` - Index on `process_after` for delayed processing queries

#### Email Logs Table
- `idx_email_logs_created_at` - Index on `created_at` for chronological queries
- `idx_email_logs_recipient_email` - Index on `recipient_email` for recipient-specific queries

#### Health Checks Table
- `idx_health_checks_last_checked` - Index on `last_checked` for recent health check queries

#### Health Logs Table
- `idx_health_logs_check_id_timestamp` - Composite index on `check_id` and `timestamp` for check-specific chronological queries

#### Dealer Credentials Table
- `idx_dealer_credentials_dealer_id_platform` - Composite index on `dealer_id` and `platform` for dealer-specific platform queries

### 2. Query Caching

A caching layer has been implemented to reduce database load for frequently accessed data:

- In-memory cache using `node-cache`
- Configurable TTL (Time-To-Live) for different types of data
- Cache key generation based on query parameters
- Cache bypass option for force-refreshing data

### 3. Query Optimization

Optimized query patterns have been implemented:

- Using specific columns instead of `SELECT *`
- Adding appropriate `WHERE` clauses to filter data early
- Using `LIMIT` to restrict result set size
- Ordering results efficiently with indexes
- Using composite indexes for multi-column filters

### 4. Database Maintenance

Regular database maintenance tasks:

- `ANALYZE` command to update statistics for the query planner
- Monitoring slow queries
- Tracking index usage statistics

## Optimized Query Services

The following services provide optimized database access:

### `dbOptimizationService.ts`

- `executeWithCache()` - Execute a query with caching
- `clearCache()` - Clear the entire cache
- `clearCacheKey()` - Clear a specific cache key
- `explainQuery()` - Get query execution statistics
- `getDatabaseStats()` - Get database statistics
- `findSlowQueries()` - Find slow queries in the database
- `optimizeTable()` - Optimize a table by analyzing it
- `indexExists()` - Check if an index exists
- `createIndexIfNotExists()` - Create an index if it doesn't exist

### `queryOptimizer.ts`

- `getRecentTaskLogs()` - Get recent task logs with caching
- `getTaskLogsByStatus()` - Get task logs by status with caching
- `getTaskLogsByUser()` - Get task logs by user with caching
- `getActiveWorkflows()` - Get active workflows with caching
- `getWorkflowsByUser()` - Get workflows by user with caching
- `getPendingEmails()` - Get pending emails with caching
- `getEmailLogsByRecipient()` - Get email logs by recipient with caching
- `getHealthCheckStatus()` - Get health check status with caching
- `getDealerCredentialsByDealerId()` - Get dealer credentials by dealer ID with caching

## Performance Testing

A performance testing script is available to compare query performance before and after optimization:

```bash
# Run the performance test
npm run ts-node src/scripts/test-query-performance.ts
```

The script measures execution time for:
- Unoptimized queries
- Optimized queries (first run, no cache)
- Optimized queries (with cache)

## Best Practices

### When to Use Indexes

- Add indexes to columns used in `WHERE` clauses
- Add indexes to columns used in `ORDER BY` clauses
- Add indexes to columns used in `JOIN` conditions
- Add composite indexes for multi-column filters
- Avoid over-indexing as it slows down writes

### When to Use Caching

- Cache frequently accessed, rarely changing data
- Use short TTL for data that changes frequently
- Use longer TTL for reference data that rarely changes
- Clear cache when data is updated

### Query Patterns to Avoid

- Using `SELECT *` instead of specific columns
- Not using `LIMIT` for large result sets
- Using functions on indexed columns in `WHERE` clauses
- Using `OR` conditions that can't use indexes effectively
- Not using prepared statements

### Query Patterns to Prefer

- Select only the columns you need
- Use `LIMIT` to restrict result set size
- Use indexed columns in `WHERE` clauses
- Use `AND` conditions that can use indexes effectively
- Use prepared statements to prevent SQL injection

## Monitoring and Maintenance

Regular monitoring and maintenance tasks:

1. **Monitor slow queries**:
   ```sql
   SELECT query, calls, total_time / calls as avg_time
   FROM pg_stat_statements
   ORDER BY total_time / calls DESC
   LIMIT 10;
   ```

2. **Check index usage**:
   ```sql
   SELECT relname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

3. **Update statistics**:
   ```sql
   ANALYZE table_name;
   ```

4. **Check table sizes**:
   ```sql
   SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
   FROM pg_stat_user_tables
   ORDER BY pg_total_relation_size(relid) DESC;
   ```

## Conclusion

By implementing these optimization techniques, we've significantly improved database performance:

- Reduced query execution time
- Decreased database load
- Improved application responsiveness
- Enhanced scalability

Continue monitoring database performance and adjust optimization strategies as needed.
