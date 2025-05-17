#!/usr/bin/env node

/**
 * Performance Analysis Script
 * 
 * This script analyzes performance data collected by the performance monitoring service.
 * It generates reports and identifies performance bottlenecks.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const OUTPUT_DIR = path.resolve(process.cwd(), 'performance-reports');
const METRICS_TABLE = 'performance_metrics';
const REPORT_PERIOD = process.argv[2] || '24h'; // Default: 24 hours

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get database connection string
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

console.log(`Analyzing performance data for the last ${REPORT_PERIOD}...`);

// Check if metrics table exists
async function checkMetricsTable() {
  try {
    const result = execSync(
      `psql "${dbUrl}" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${METRICS_TABLE}');"`,
      { encoding: 'utf8' }
    );
    
    return result.includes('t');
  } catch (error) {
    console.error('Error checking metrics table:', error);
    return false;
  }
}

// Get performance metrics from database
async function getPerformanceMetrics() {
  try {
    const result = execSync(
      `psql "${dbUrl}" -c "SELECT * FROM ${METRICS_TABLE} WHERE timestamp > NOW() - INTERVAL '${REPORT_PERIOD}' ORDER BY timestamp ASC;" -t -A -F"," --csv-header`,
      { encoding: 'utf8' }
    );
    
    // Save raw CSV data
    const csvPath = path.join(OUTPUT_DIR, 'performance_metrics.csv');
    fs.writeFileSync(csvPath, result);
    console.log(`Raw metrics saved to ${csvPath}`);
    
    return result;
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return null;
  }
}

// Analyze API performance
async function analyzeApiPerformance() {
  try {
    const result = execSync(
      `psql "${dbUrl}" -c "
        SELECT 
          app_metrics->>'path' as endpoint,
          COUNT(*) as request_count,
          AVG((app_metrics->>'responseTime')::numeric) as avg_response_time,
          MAX((app_metrics->>'responseTime')::numeric) as max_response_time,
          MIN((app_metrics->>'responseTime')::numeric) as min_response_time
        FROM ${METRICS_TABLE}
        WHERE timestamp > NOW() - INTERVAL '${REPORT_PERIOD}'
        GROUP BY endpoint
        ORDER BY avg_response_time DESC
        LIMIT 10;
      " -t -A -F"," --csv-header`,
      { encoding: 'utf8' }
    );
    
    // Save API performance report
    const reportPath = path.join(OUTPUT_DIR, 'api_performance.csv');
    fs.writeFileSync(reportPath, result);
    console.log(`API performance report saved to ${reportPath}`);
    
    return result;
  } catch (error) {
    console.error('Error analyzing API performance:', error);
    return null;
  }
}

// Analyze system performance
async function analyzeSystemPerformance() {
  try {
    const result = execSync(
      `psql "${dbUrl}" -c "
        SELECT 
          to_char(timestamp, 'YYYY-MM-DD HH24:MI') as time,
          AVG((system_metrics->>'cpuUsage')::numeric) as avg_cpu_usage,
          AVG((system_metrics->'memoryUsage'->>'percentUsed')::numeric) as avg_memory_usage
        FROM ${METRICS_TABLE}
        WHERE timestamp > NOW() - INTERVAL '${REPORT_PERIOD}'
        GROUP BY time
        ORDER BY time ASC;
      " -t -A -F"," --csv-header`,
      { encoding: 'utf8' }
    );
    
    // Save system performance report
    const reportPath = path.join(OUTPUT_DIR, 'system_performance.csv');
    fs.writeFileSync(reportPath, result);
    console.log(`System performance report saved to ${reportPath}`);
    
    return result;
  } catch (error) {
    console.error('Error analyzing system performance:', error);
    return null;
  }
}

// Analyze cache performance
async function analyzeCachePerformance() {
  try {
    const result = execSync(
      `psql "${dbUrl}" -c "
        SELECT 
          to_char(timestamp, 'YYYY-MM-DD HH24:MI') as time,
          AVG((cache_stats->'stats'->>'hits')::numeric) as cache_hits,
          AVG((cache_stats->'stats'->>'misses')::numeric) as cache_misses,
          CASE 
            WHEN AVG((cache_stats->'stats'->>'hits')::numeric) + AVG((cache_stats->'stats'->>'misses')::numeric) > 0 
            THEN AVG((cache_stats->'stats'->>'hits')::numeric) / (AVG((cache_stats->'stats'->>'hits')::numeric) + AVG((cache_stats->'stats'->>'misses')::numeric)) 
            ELSE 0 
          END as hit_ratio
        FROM ${METRICS_TABLE}
        WHERE timestamp > NOW() - INTERVAL '${REPORT_PERIOD}'
        GROUP BY time
        ORDER BY time ASC;
      " -t -A -F"," --csv-header`,
      { encoding: 'utf8' }
    );
    
    // Save cache performance report
    const reportPath = path.join(OUTPUT_DIR, 'cache_performance.csv');
    fs.writeFileSync(reportPath, result);
    console.log(`Cache performance report saved to ${reportPath}`);
    
    return result;
  } catch (error) {
    console.error('Error analyzing cache performance:', error);
    return null;
  }
}

// Generate HTML report
function generateHtmlReport() {
  try {
    // Create HTML report
    const htmlPath = path.join(OUTPUT_DIR, 'performance_report.html');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Performance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            h2 { color: #666; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Performance Report</h1>
          <p>Report period: Last ${REPORT_PERIOD}</p>
          <p>Generated on: ${new Date().toISOString()}</p>
          
          <h2>API Performance</h2>
          <iframe width="100%" height="400" src="api_performance.csv"></iframe>
          
          <h2>System Performance</h2>
          <iframe width="100%" height="400" src="system_performance.csv"></iframe>
          
          <h2>Cache Performance</h2>
          <iframe width="100%" height="400" src="cache_performance.csv"></iframe>
        </body>
      </html>
    `;
    
    fs.writeFileSync(htmlPath, html);
    console.log(`HTML report saved to ${htmlPath}`);
  } catch (error) {
    console.error('Error generating HTML report:', error);
  }
}

// Main function
async function main() {
  try {
    // Check if metrics table exists
    const tableExists = await checkMetricsTable();
    if (!tableExists) {
      console.error(`Metrics table '${METRICS_TABLE}' does not exist`);
      process.exit(1);
    }
    
    // Get performance metrics
    await getPerformanceMetrics();
    
    // Analyze performance data
    await analyzeApiPerformance();
    await analyzeSystemPerformance();
    await analyzeCachePerformance();
    
    // Generate HTML report
    generateHtmlReport();
    
    console.log(`Performance analysis completed. Reports saved to ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Error analyzing performance data:', error);
    process.exit(1);
  }
}

// Run main function
main();
