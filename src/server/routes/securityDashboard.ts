/**
 * Security Dashboard Routes
 * 
 * Provides API endpoints for the security dashboard
 */
import express from 'express';
import { isAuthenticated } from '../auth.js';
import { requireAdmin, requirePermission } from '../../shared/middleware/rbacMiddleware.js';
import { logger } from '../../shared/logger.js';
import { db } from '../../shared/db.js';
import { securityAuditLogs, apiKeys } from '../../shared/schema.js';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';
import { isError } from '../../utils/errorUtils.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * Get security dashboard summary
 * 
 * @route GET /api/security/dashboard
 * @group Security - Security dashboard operations
 * @returns {object} 200 - Security dashboard summary
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 500 - Internal server error
 */
router.get('/dashboard', requirePermission('security', 'read'), async (req, res) => {
  try {
    // Calculate time ranges
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);
    
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    // Get security event counts by severity
    const eventCounts = await db
      .select({
        severity: securityAuditLogs.severity,
        count: count(),
      })
      .from(securityAuditLogs)
      .where(gte(securityAuditLogs.timestamp, oneWeekAgo))
      .groupBy(securityAuditLogs.severity);
    
    // Get recent critical events
    const criticalEvents = await db
      .select()
      .from(securityAuditLogs)
      .where(
        and(
          eq(securityAuditLogs.severity, 'critical'),
          gte(securityAuditLogs.timestamp, oneWeekAgo)
        )
      )
      .orderBy(desc(securityAuditLogs.timestamp))
      .limit(10);
    
    // Get API key statistics
    const apiKeyStats = await db
      .select({
        active: count(apiKeys.id),
        expiring: sql`COUNT(CASE WHEN ${apiKeys.expiresAt} IS NOT NULL AND ${apiKeys.expiresAt} > NOW() AND ${apiKeys.expiresAt} < NOW() + INTERVAL '7 days' THEN 1 END)`,
        expired: sql`COUNT(CASE WHEN ${apiKeys.expiresAt} IS NOT NULL AND ${apiKeys.expiresAt} <= NOW() THEN 1 END)`,
        pendingRotation: sql`COUNT(CASE WHEN ${apiKeys.rotationStatus} = 'pending_rotation' THEN 1 END)`,
      })
      .from(apiKeys)
      .where(eq(apiKeys.active, true));
    
    // Get login failure statistics
    const loginFailures = await db
      .select({
        count: count(),
      })
      .from(securityAuditLogs)
      .where(
        and(
          eq(securityAuditLogs.eventType, 'login_failed'),
          gte(securityAuditLogs.timestamp, oneDayAgo)
        )
      );
    
    // Get permission denied statistics
    const permissionDenied = await db
      .select({
        count: count(),
      })
      .from(securityAuditLogs)
      .where(
        and(
          eq(securityAuditLogs.eventType, 'permission_denied'),
          gte(securityAuditLogs.timestamp, oneDayAgo)
        )
      );
    
    // Return the dashboard data
    res.json({
      eventCounts,
      criticalEvents,
      apiKeyStats: apiKeyStats[0],
      loginFailures: loginFailures[0]?.count || 0,
      permissionDenied: permissionDenied[0]?.count || 0,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'security_dashboard_error',
      error: errorMessage,
    }, `Failed to get security dashboard: ${errorMessage}`);
    
    res.status(500).json({
      message: 'Failed to get security dashboard',
      error: errorMessage,
    });
  }
});

/**
 * Get security audit logs
 * 
 * @route GET /api/security/audit-logs
 * @group Security - Security dashboard operations
 * @param {string} startDate.query - Start date (ISO format)
 * @param {string} endDate.query - End date (ISO format)
 * @param {string} severity.query - Filter by severity
 * @param {string} eventType.query - Filter by event type
 * @param {number} limit.query - Limit number of results
 * @param {number} offset.query - Offset for pagination
 * @returns {object} 200 - Security audit logs
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 500 - Internal server error
 */
router.get('/audit-logs', requirePermission('security', 'read'), async (req, res) => {
  try {
    // Parse query parameters
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const severity = req.query.severity as string | undefined;
    const eventType = req.query.eventType as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    // Build query conditions
    let conditions = and(
      gte(securityAuditLogs.timestamp, startDate),
      lte(securityAuditLogs.timestamp, endDate)
    );
    
    if (severity) {
      conditions = and(conditions, eq(securityAuditLogs.severity, severity));
    }
    
    if (eventType) {
      conditions = and(conditions, eq(securityAuditLogs.eventType, eventType));
    }
    
    // Get audit logs
    const logs = await db
      .select()
      .from(securityAuditLogs)
      .where(conditions)
      .orderBy(desc(securityAuditLogs.timestamp))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const countResult = await db
      .select({
        count: count(),
      })
      .from(securityAuditLogs)
      .where(conditions);
    
    // Return the audit logs
    res.json({
      logs,
      total: countResult[0]?.count || 0,
      limit,
      offset,
      hasMore: (countResult[0]?.count || 0) > offset + limit,
    });
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'security_audit_logs_error',
      error: errorMessage,
    }, `Failed to get security audit logs: ${errorMessage}`);
    
    res.status(500).json({
      message: 'Failed to get security audit logs',
      error: errorMessage,
    });
  }
});

/**
 * Get API key security status
 * 
 * @route GET /api/security/api-keys
 * @group Security - Security dashboard operations
 * @returns {object} 200 - API key security status
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 403 - Forbidden
 * @returns {Error} 500 - Internal server error
 */
router.get('/api-keys', requirePermission('security', 'read'), async (req, res) => {
  try {
    // Get API keys with security status
    const keys = await db
      .select({
        id: apiKeys.id,
        keyName: apiKeys.keyName,
        service: apiKeys.service,
        label: apiKeys.label,
        role: apiKeys.role,
        keyVersion: apiKeys.keyVersion,
        expiresAt: apiKeys.expiresAt,
        rotatedAt: apiKeys.rotatedAt,
        rotationStatus: apiKeys.rotationStatus,
        active: apiKeys.active,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .orderBy(desc(apiKeys.updatedAt));
    
    // Return the API keys
    res.json({
      keys,
      count: keys.length,
    });
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'security_api_keys_error',
      error: errorMessage,
    }, `Failed to get API key security status: ${errorMessage}`);
    
    res.status(500).json({
      message: 'Failed to get API key security status',
      error: errorMessage,
    });
  }
});

// Export the router
export default router;
