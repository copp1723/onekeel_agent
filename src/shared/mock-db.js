/**
 * Mock database implementation for development and testing
 */

// In-memory storage for mock database tables
const tables = {
  insight_logs: [],
  reports: [],
  insights: [],
  taskLogs: [],
  imapFilters: [],
  healthChecks: [],
  failedEmails: [],
};

// Mock database client
export const db = {
  /**
   * Execute a SQL query
   */
  execute: async (query, params = []) => {
    console.log(`Mock DB execute: ${query}`);
    console.log(`Params: ${JSON.stringify(params)}`);
    
    // Handle CREATE TABLE queries
    if (query.toLowerCase().includes('create table')) {
      const tableName = extractTableName(query);
      console.log(`Creating table: ${tableName}`);
      return [{ created: true, table: tableName }];
    }
    
    // Handle INSERT queries
    if (query.toLowerCase().includes('insert into')) {
      const tableName = extractTableName(query);
      console.log(`Inserting into table: ${tableName}`);
      return [{ inserted: true, table: tableName }];
    }
    
    // Handle SELECT queries
    if (query.toLowerCase().includes('select')) {
      const tableName = extractTableName(query);
      console.log(`Selecting from table: ${tableName}`);
      return tables[tableName] || [];
    }
    
    // Handle UPDATE queries
    if (query.toLowerCase().includes('update')) {
      const tableName = extractTableName(query);
      console.log(`Updating table: ${tableName}`);
      return [{ updated: true, table: tableName }];
    }
    
    // Handle DELETE queries
    if (query.toLowerCase().includes('delete')) {
      const tableName = extractTableName(query);
      console.log(`Deleting from table: ${tableName}`);
      return [{ deleted: true, table: tableName }];
    }
    
    return [];
  },
  
  /**
   * Insert data into a table
   */
  insert: (table) => {
    return {
      values: (data) => {
        console.log(`Mock DB insert into ${table.$table.name}:`, data);
        const tableName = table.$table.name;
        
        if (!tables[tableName]) {
          tables[tableName] = [];
        }
        
        tables[tableName].push(data);
        return Promise.resolve({ insertId: tables[tableName].length });
      }
    };
  },
  
  /**
   * Update data in a table
   */
  update: (table) => {
    return {
      set: (data) => {
        return {
          where: (condition) => {
            console.log(`Mock DB update ${table.$table.name}:`, data);
            console.log(`Condition:`, condition);
            return Promise.resolve({ updated: true });
          }
        };
      }
    };
  },
  
  /**
   * Query data from a table
   */
  query: {
    reports: {
      findFirst: async (options) => {
        console.log('Mock DB query reports.findFirst:', options);
        return {
          id: 'mock-report-id',
          reportData: {
            records: [
              { id: 1, name: 'Test Record 1', value: 100 },
              { id: 2, name: 'Test Record 2', value: 200 },
            ],
            metadata: {
              source: 'Mock Database',
              date: new Date().toISOString(),
            }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }
  }
};

/**
 * Extract table name from a SQL query
 */
function extractTableName(query) {
  // Simple regex to extract table name
  const createMatch = query.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)/i);
  if (createMatch) return createMatch[1];
  
  const insertMatch = query.match(/insert\s+into\s+(\w+)/i);
  if (insertMatch) return insertMatch[1];
  
  const selectMatch = query.match(/select\s+.+\s+from\s+(\w+)/i);
  if (selectMatch) return selectMatch[1];
  
  const updateMatch = query.match(/update\s+(\w+)/i);
  if (updateMatch) return updateMatch[1];
  
  const deleteMatch = query.match(/delete\s+from\s+(\w+)/i);
  if (deleteMatch) return deleteMatch[1];
  
  return 'unknown';
}
