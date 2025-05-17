/**
 * Database Helper Utilities
 * 
 * Provides standardized functions for common database operations
 */
import { db } from '../shared/db.js';
import { eq, and, or, desc, asc } from 'drizzle-orm';
import { getErrorMessage, logFormattedError } from './errorHandling.js';
import { logger } from '../shared/logger.js';

/**
 * Generic function to find a record by ID
 */
export async function findById<T extends { id: string }>(
  table: any,
  id: string,
  options: {
    errorOnNotFound?: boolean;
    relations?: any[];
    context?: Record<string, any>;
  } = {}
): Promise<T | null> {
  const { errorOnNotFound = false, relations = [], context = {} } = options;
  
  try {
    let query = db.select().from(table).where(eq(table.id, id));
    
    // Add relations if specified
    if (relations.length > 0) {
      // This is a simplified example - actual relation handling would depend on your ORM
      // For Drizzle, you might use different approaches based on your schema
    }
    
    const results = await query;
    
    if (results.length === 0) {
      if (errorOnNotFound) {
        throw new Error(`Record not found in ${table.name} with id: ${id}`);
      }
      return null;
    }
    
    return results[0] as T;
  } catch (error) {
    logFormattedError(error, {
      ...context,
      operation: 'findById',
      table: table.name,
      id,
    });
    throw error;
  }
}

/**
 * Generic function to find all records in a table
 */
export async function findAll<T>(
  table: any,
  options: {
    where?: any;
    orderBy?: { column: any; direction: 'asc' | 'desc' }[];
    limit?: number;
    offset?: number;
    relations?: any[];
    context?: Record<string, any>;
  } = {}
): Promise<T[]> {
  const { 
    where = null, 
    orderBy = [], 
    limit = 100, 
    offset = 0,
    relations = [],
    context = {}
  } = options;
  
  try {
    let query = db.select().from(table);
    
    // Add where clause if specified
    if (where) {
      query = query.where(where);
    }
    
    // Add order by clauses
    if (orderBy.length > 0) {
      orderBy.forEach(order => {
        if (order.direction === 'asc') {
          query = query.orderBy(asc(order.column));
        } else {
          query = query.orderBy(desc(order.column));
        }
      });
    }
    
    // Add limit and offset
    query = query.limit(limit).offset(offset);
    
    // Add relations if specified
    if (relations.length > 0) {
      // This is a simplified example - actual relation handling would depend on your ORM
    }
    
    const results = await query;
    return results as T[];
  } catch (error) {
    logFormattedError(error, {
      ...context,
      operation: 'findAll',
      table: table.name,
    });
    throw error;
  }
}

/**
 * Generic function to create a record
 */
export async function create<T>(
  table: any,
  data: Record<string, any>,
  options: {
    context?: Record<string, any>;
  } = {}
): Promise<T> {
  const { context = {} } = options;
  
  try {
    const [result] = await db.insert(table).values(data).returning();
    return result as T;
  } catch (error) {
    logFormattedError(error, {
      ...context,
      operation: 'create',
      table: table.name,
    });
    throw error;
  }
}

/**
 * Generic function to update a record
 */
export async function update<T>(
  table: any,
  id: string,
  data: Record<string, any>,
  options: {
    context?: Record<string, any>;
  } = {}
): Promise<T | null> {
  const { context = {} } = options;
  
  try {
    const [result] = await db
      .update(table)
      .set(data)
      .where(eq(table.id, id))
      .returning();
    
    return result as T || null;
  } catch (error) {
    logFormattedError(error, {
      ...context,
      operation: 'update',
      table: table.name,
      id,
    });
    throw error;
  }
}

/**
 * Generic function to delete a record
 */
export async function remove(
  table: any,
  id: string,
  options: {
    context?: Record<string, any>;
  } = {}
): Promise<boolean> {
  const { context = {} } = options;
  
  try {
    const result = await db
      .delete(table)
      .where(eq(table.id, id))
      .returning({ id: table.id });
    
    return result.length > 0;
  } catch (error) {
    logFormattedError(error, {
      ...context,
      operation: 'remove',
      table: table.name,
      id,
    });
    throw error;
  }
}
