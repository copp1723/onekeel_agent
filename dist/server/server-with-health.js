/**
 * Enhanced Server Implementation with Health Monitoring
 *
 * This version adds health monitoring capabilities to the API server
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from '../shared/db.js';
import { sql } from 'drizzle-orm';
import { registerHealthRoutes } from './routes/health.js';
import { createServer } from 'http';
// Load environment variables
dotenv.config();
// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Basic health check endpoint
app.get('/health', async (req, res) => {
    try {
        await db.execute(sql `SELECT 1`);
        res.status(200).json({
            status: 'ok',
            message: 'API server is running',
            timestamp: new Date()
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            timestamp: new Date()
        });
    }
});
// Register all API routes
async function registerRoutes() {
    try {
        // Create health_checks and health_logs tables if they don't exist
        console.log('Setting up health monitoring tables...');
        await setupHealthTables();
        // Register health monitoring routes
        registerHealthRoutes(app);
        console.log('Health monitoring routes registered');
        // Start the server
        const httpServer = createServer(app);
        httpServer.listen(PORT, () => {
            console.log(`API server with health monitoring running on port ${PORT}`);
            console.log('Available endpoints:');
            console.log('  GET /health - Basic health check');
            console.log('  GET /api/health-monitoring/summary - Get health monitoring summary');
            console.log('  GET /api/health-monitoring/checks - Get all health checks');
            console.log('  POST /api/health-monitoring/checks/run - Run all health checks');
            console.log('  GET /api/health-monitoring/logs/:checkId - Get logs for a specific check');
        });
    }
    catch (error) {
        console.error('Failed to register routes:', error);
        process.exit(1);
    }
}
/**
 * Set up health monitoring tables
 */
async function setupHealthTables() {
    try {
        // Check if the tables already exist
        const tablesExist = await db.execute(sql `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'health_checks'
      ) AS health_checks_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'health_logs'
      ) AS health_logs_exists;
    `);
        const result = tablesExist.rows[0];
        if (!result) {
            throw new Error('Failed to check for existing tables');
        }
        const healthChecksExists = result.health_checks_exists;
        const healthLogsExists = result.health_logs_exists;
        if (healthChecksExists && healthLogsExists) {
            console.log('Health monitoring tables already exist');
            return;
        }
        // Create the health_checks table if it doesn't exist
        if (!healthChecksExists) {
            await db.execute(sql `
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
        }
        // Create the health_logs table if it doesn't exist
        if (!healthLogsExists) {
            await db.execute(sql `
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
        }
        console.log('Health monitoring tables setup complete');
    }
    catch (error) {
        console.error('Error setting up health monitoring tables:', error);
        throw error;
    }
}
// Run the server
registerRoutes().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=server-with-health.js.map