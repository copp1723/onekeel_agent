/**
 * Health Monitoring API Routes
 * Provides endpoints for the health monitoring dashboard
 */

import { Router } from 'express';
import { db } from '../../shared/db.js';
import { sql } from 'drizzle-orm';

// Create router
const router = Router();

// Get health summary
router.get('/api/health-monitoring/summary', async (req, res) => {
  try {
    // Calculate status counts 
    const result = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM health_checks
      GROUP BY status
    `);
    
    const statusCounts = {
      ok: 0,
      warning: 0,
      error: 0
    };
    
    // Calculate status counts
    if (result.rows) {
      result.rows.forEach(row => {
        if (row.status in statusCounts) {
          statusCounts[row.status] = parseInt(row.count, 10);
        }
      });
    }
    
    // Calculate total services
    const servicesCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    // Determine overall status
    let overallStatus = 'ok';
    if (statusCounts.error > 0) {
      overallStatus = 'error';
    } else if (statusCounts.warning > 0) {
      overallStatus = 'warning';
    }
    
    // Get average response time
    const responseTimeResult = await db.execute(sql`
      SELECT AVG(response_time) as avg_response_time
      FROM health_checks
    `);
    
    const averageResponseTime = responseTimeResult.rows[0]?.avg_response_time || 0;
    
    // Get most recent check time
    const lastCheckedResult = await db.execute(sql`
      SELECT MAX(last_checked) as last_checked
      FROM health_checks
    `);
    
    const lastChecked = lastCheckedResult.rows[0]?.last_checked || null;
    
    const summary = {
      overallStatus,
      servicesCount,
      servicesOk: statusCounts.ok,
      servicesWarning: statusCounts.warning,
      servicesError: statusCounts.error,
      averageResponseTime: parseFloat(averageResponseTime),
      lastChecked
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error getting health summary:', error);
    res.status(500).json({ error: 'Failed to retrieve health summary' });
  }
});

// Get all health checks
router.get('/api/health-monitoring/checks', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM health_checks ORDER BY last_checked DESC`);
    const checks = result.rows || [];
    
    // Parse JSON details if present
    const formattedChecks = checks.map(check => ({
      ...check,
      details: check.details ? JSON.parse(check.details) : undefined
    }));
    
    res.json(formattedChecks);
  } catch (error) {
    console.error('Error fetching health checks:', error);
    res.status(500).json({ error: 'Failed to retrieve health checks' });
  }
});

// Run all health checks
router.post('/api/health-monitoring/checks/run', async (req, res) => {
  try {
    // Run health checks for database, email, OpenAI, and scheduler
    const checks = [
      await checkDatabaseHealth(),
      await checkEmailService(),
      await checkOpenAIService(),
      await checkSchedulerService()
    ];
    
    // Store each check in the database
    for (const check of checks) {
      await storeHealthCheckResult(check);
    }
    
    // Return the updated health checks
    const result = await db.execute(sql`SELECT * FROM health_checks ORDER BY last_checked DESC`);
    const updatedChecks = result.rows || [];
    
    // Parse JSON details if present
    const formattedChecks = updatedChecks.map(check => ({
      ...check,
      details: check.details ? JSON.parse(check.details) : undefined
    }));
    
    res.json(formattedChecks);
  } catch (error) {
    console.error('Error running health checks:', error);
    res.status(500).json({ error: 'Failed to run health checks' });
  }
});

// Get health logs for a specific check
router.get('/api/health-monitoring/logs/:checkId', async (req, res) => {
  try {
    const { checkId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    
    const result = await db.execute(
      sql`SELECT * FROM health_logs 
          WHERE check_id = ${checkId} 
          ORDER BY timestamp DESC 
          LIMIT ${limit}`
    );
    
    const logs = result.rows || [];
    
    // Parse JSON details if present
    const formattedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : undefined
    }));
    
    res.json(formattedLogs);
  } catch (error) {
    console.error('Error fetching health logs:', error);
    res.status(500).json({ error: 'Failed to retrieve health logs' });
  }
});

// Run a specific health check
router.post('/api/health-monitoring/checks/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    
    let check;
    switch (id) {
      case 'database':
        check = await checkDatabaseHealth();
        break;
      case 'email':
        check = await checkEmailService();
        break;
      case 'openai':
        check = await checkOpenAIService();
        break;
      case 'scheduler':
        check = await checkSchedulerService();
        break;
      default:
        return res.status(404).json({ error: 'Health check not found' });
    }
    
    await storeHealthCheckResult(check);
    
    res.json(check);
  } catch (error) {
    console.error('Error running health check:', error);
    res.status(500).json({ error: 'Failed to run health check' });
  }
});

// Default health check for the database
async function checkDatabaseHealth() {
  const id = 'database';
  const name = 'Database';
  const startTime = Date.now();
  
  try {
    // Simple query to test database connectivity
    await db.execute(sql`SELECT 1`);
    
    const responseTime = Date.now() - startTime;
    
    return {
      id,
      name,
      status: 'ok',
      responseTime,
      lastChecked: new Date(),
      message: 'Database is operational',
      details: {
        connectionString: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@') : 
          'Using environment variables'
      }
    };
  } catch (error) {
    return {
      id,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: `Database error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Health check for the email service
async function checkEmailService() {
  const id = 'email';
  const name = 'Email Service';
  const startTime = Date.now();
  
  try {
    // Check if SendGrid API key is configured
    const hasSendGridKey = !!process.env.SENDGRID_API_KEY;
    
    const status = hasSendGridKey ? 'ok' : 'warning';
    const message = hasSendGridKey 
      ? 'Email service is configured'
      : 'Using Nodemailer fallback (no SendGrid API key)';
    
    return {
      id,
      name,
      status,
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message,
      details: {
        provider: hasSendGridKey ? 'SendGrid' : 'Nodemailer',
        configured: hasSendGridKey
      }
    };
  } catch (error) {
    return {
      id,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: `Email service error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Health check for the AI API (OpenAI)
async function checkOpenAIService() {
  const id = 'openai';
  const name = 'OpenAI Service';
  const startTime = Date.now();
  
  try {
    // Check if OpenAI API key is configured
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    
    const status = hasOpenAIKey ? 'ok' : 'error';
    const message = hasOpenAIKey 
      ? 'AI service is configured'
      : 'Missing OpenAI API key';
    
    return {
      id,
      name,
      status,
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message,
      details: {
        provider: 'OpenAI',
        configured: hasOpenAIKey
      }
    };
  } catch (error) {
    return {
      id,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: `AI service error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Health check for the scheduler service
async function checkSchedulerService() {
  const id = 'scheduler';
  const name = 'Scheduler Service';
  const startTime = Date.now();
  
  try {
    // Check if there are any active schedules
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM schedules WHERE enabled = true
    `);
    
    const count = result.rows[0]?.count || 0;
    
    return {
      id,
      name,
      status: 'ok',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: 'Scheduler service is operational',
      details: {
        activeSchedules: parseInt(count, 10)
      }
    };
  } catch (error) {
    return {
      id,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: `Scheduler error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Store a health check result in the database
async function storeHealthCheckResult(result) {
  try {
    // Check if health_checks table exists, create it if not
    const healthChecksExists = await checkTableExists('health_checks');
    const healthLogsExists = await checkTableExists('health_logs');
    
    if (!healthChecksExists) {
      await createHealthChecksTable();
    }
    
    if (!healthLogsExists) {
      await createHealthLogsTable();
    }
    
    // Get existing health check or create a new one
    const existingChecks = await db.execute(
      sql`SELECT * FROM health_checks WHERE id = ${result.id}`
    );
    
    let checkId = result.id;
    const details = result.details ? JSON.stringify(result.details) : null;
    
    if (existingChecks.rows && existingChecks.rows.length > 0) {
      // Update existing health check
      await db.execute(sql`
        UPDATE health_checks
        SET
          status = ${result.status},
          response_time = ${result.responseTime},
          last_checked = ${result.lastChecked},
          message = ${result.message || null},
          details = ${details},
          updated_at = NOW()
        WHERE id = ${checkId}
      `);
    } else {
      // Create new health check
      await db.execute(sql`
        INSERT INTO health_checks (
          id, name, status, response_time, last_checked, message, details, created_at, updated_at
        ) VALUES (
          ${checkId},
          ${result.name},
          ${result.status},
          ${result.responseTime},
          ${result.lastChecked},
          ${result.message || null},
          ${details},
          NOW(),
          NOW()
        )
      `);
    }
    
    // Add entry to health logs
    await db.execute(sql`
      INSERT INTO health_logs (
        id, check_id, timestamp, status, response_time, message, details
      ) VALUES (
        gen_random_uuid(),
        ${checkId},
        ${result.lastChecked},
        ${result.status},
        ${result.responseTime},
        ${result.message || null},
        ${details}
      )
    `);
    
  } catch (error) {
    console.error('Error storing health check result:', error);
    throw error;
  }
}

// Check if a table exists
async function checkTableExists(tableName) {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = ${tableName}
      ) AS "exists"
    `);
    
    if (result && result.rows && result.rows.length > 0) {
      return result.rows[0].exists === true;
    } else {
      console.log('No result data returned when checking table', tableName);
      // If we can't determine, assume table doesn't exist to force creation
      return false;
    }
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Create health_checks table
async function createHealthChecksTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS health_checks (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL,
        response_time INTEGER NOT NULL,
        last_checked TIMESTAMP NOT NULL,
        message TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
      CREATE INDEX IF NOT EXISTS idx_health_checks_last_checked ON health_checks(last_checked);
    `);
    console.log('Created health_checks table');
    return true;
  } catch (error) {
    console.error('Error creating health_checks table:', error);
    return false;
  }
}

// Create health_logs table
async function createHealthLogsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS health_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        check_id VARCHAR(50) NOT NULL REFERENCES health_checks(id) ON DELETE CASCADE,
        timestamp TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL,
        response_time INTEGER NOT NULL,
        message TEXT,
        details TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_health_logs_check_id ON health_logs(check_id);
      CREATE INDEX IF NOT EXISTS idx_health_logs_timestamp ON health_logs(timestamp);
    `);
    console.log('Created health_logs table');
    return true;
  } catch (error) {
    console.error('Error creating health_logs table:', error);
    return false;
  }
}

// Register health routes
export function registerHealthRoutes(app) {
  app.use(router);
  console.log('Health monitoring routes registered');
}