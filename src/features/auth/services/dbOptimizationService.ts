/**
 * Database Optimization Service
 *
 * Service for optimizing database queries and implementing caching.
 */
import { db } from '../../../../shared/db.js';
import { sql } from 'drizzle-orm';
import NodeCache from 'node-cache';
// Initialize cache with default TTL of 5 minutes and check period of 1 minute
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});
/**
 * Cache options
 */
export interface CacheOptions {
  ttl?: number;
  key?: string;
  bypass?: boolean;
}
/**
 * Execute a query with caching
 *
 * @param queryFn - Function that executes the query
 * @param options - Cache options
 * @returns Query result
 */
export async function executeWithCache<T>(
  queryFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl, key, bypass = false } = options;
  // Generate cache key if not provided
  const cacheKey = key || `query_${Math.random().toString(36).substring(2, 15)}`;
  // Return cached result if available and bypass is not set
  if (!bypass && cache.has(cacheKey)) {
    return cache.get<T>(cacheKey)!;
  }
  // Execute the query
  const result = await queryFn();
  // Cache the result if bypass is not set
  if (!bypass) {
    cache.set(cacheKey, result, ttl);
  }
  return result;
}
/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cache.flushAll();
}
/**
 * Clear a specific cache key
 *
 * @param key - Cache key to clear
 * @returns True if the key was found and cleared, false otherwise
 */
export function clearCacheKey(key: string): boolean {
  return cache.del(key) > 0;
}
/**
 * Get query execution statistics
 *
 * @param query - SQL query to analyze
 * @returns Query execution plan
 */
export async function explainQuery(query: string): Promise<any[]> {
  try {
    const result = await db.execute(sql.raw(`EXPLAIN ANALYZE ${query}`));
    return result.rows;
  } catch (error) {
    console.error('Error explaining query:', error);
    throw error;
  }
}
/**
 * Get database statistics
 *
 * @returns Database statistics
 */
export async function getDatabaseStats(): Promise<any> {
  try {
    // Get table statistics
    const tableStats = await db.execute(
      sql.raw(`
      SELECT
        schemaname,
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_relation_size(relid)) as table_size,
        pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
    `)
    );
    // Get index statistics
    const indexStats = await db.execute(
      sql.raw(`
      SELECT
        schemaname,
        relname as table_name,
        indexrelname as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
    `)
    );
    // Get cache hit ratio
    const cacheStats = await db.execute(
      sql.raw(`
      SELECT
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit) as heap_hit,
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
      FROM pg_statio_user_tables
    `)
    );
    return {
      tables: tableStats.rows,
      indexes: indexStats.rows,
      cacheHitRatio: cacheStats.rows[0],
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
}
/**
 * Find slow queries in the database
 *
 * @param minExecutionTime - Minimum execution time in milliseconds
 * @returns Slow queries
 */
export async function findSlowQueries(minExecutionTime: number = 1000): Promise<any[]> {
  try {
    // This requires pg_stat_statements extension to be enabled
    const result = await db.execute(
      sql.raw(`
      SELECT
        query,
        calls,
        total_time / calls as avg_time,
        min_time,
        max_time,
        mean_time,
        stddev_time,
        rows
      FROM pg_stat_statements
      WHERE total_time / calls > ${minExecutionTime / 1000}
      ORDER BY total_time / calls DESC
      LIMIT 20
    `)
    );
    return result.rows;
  } catch (error) {
    console.error('Error finding slow queries:', error);
    // If pg_stat_statements is not available, return empty array
    return [];
  }
}
/**
 * Optimize a table by analyzing it
 *
 * @param tableName - Name of the table to optimize
 * @returns Result of the optimization
 */
export async function optimizeTable(tableName: string): Promise<boolean> {
  try {
    await db.execute(sql.raw(`ANALYZE ${tableName}`));
    return true;
  } catch (error) {
    console.error(`Error optimizing table ${tableName}:`, error);
    return false;
  }
}
/**
 * Check if an index exists
 *
 * @param tableName - Name of the table
 * @param indexName - Name of the index
 * @returns True if the index exists, false otherwise
 */
export async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  try {
    const result = await db.execute(
      sql.raw(`
      SELECT 1
      FROM pg_indexes
      WHERE tablename = '${tableName}'
      AND indexname = '${indexName}'
    `)
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking if index exists for ${tableName}.${indexName}:`, error);
    return false;
  }
}
/**
 * Create an index if it doesn't exist
 *
 * @param tableName - Name of the table
 * @param indexName - Name of the index
 * @param columns - Columns to index
 * @param unique - Whether the index should be unique
 * @returns True if the index was created, false otherwise
 */
export async function createIndexIfNotExists(
  tableName: string,
  indexName: string,
  columns: string[],
  unique: boolean = false
): Promise<boolean> {
  try {
    // Check if index already exists
    const exists = await indexExists(tableName, indexName);
    if (exists) {
      console.log(`Index ${indexName} already exists on table ${tableName}`);
      return false;
    }
    // Create the index
    const uniqueStr = unique ? 'UNIQUE' : '';
    const columnsStr = columns.join(', ');
    await db.execute(
      sql.raw(`
      CREATE ${uniqueStr} INDEX ${indexName} ON ${tableName} (${columnsStr})
    `)
    );
    console.log(`Created index ${indexName} on table ${tableName}`);
    return true;
  } catch (error) {
    console.error(`Error creating index ${indexName} on table ${tableName}:`, error);
    return false;
  }
}
