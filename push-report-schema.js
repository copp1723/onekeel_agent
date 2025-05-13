/**
 * Push Report Schema to Database
 * 
 * This script creates the multi-vendor report ingestion database tables
 * Run this script to set up the required database schema
 */

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './src/shared/report-schema.js';

async function pushReportSchema() {
  try {
    console.log('Pushing report schema to database...');
    
    // Use environment variables for database connection
    let dbUrl;
    
    if (process.env.DATABASE_URL) {
      dbUrl = process.env.DATABASE_URL;
      console.log('Using DATABASE_URL environment variable for connection');
    } else if (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER) {
      // Construct connection URL from individual variables
      const host = process.env.PGHOST;
      const database = process.env.PGDATABASE;
      const user = process.env.PGUSER;
      const password = process.env.PGPASSWORD;
      const port = process.env.PGPORT || 5432;
      
      dbUrl = `postgres://${user}:${password}@${host}:${port}/${database}`;
      console.log('Using Replit PostgreSQL environment variables for database connection');
    } else {
      throw new Error('No database connection information found. Please set DATABASE_URL or individual PG* environment variables.');
    }
    
    // Create database connection
    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await client.connect();
    console.log('Connected to database successfully');
    
    // Initialize Drizzle with schema
    const db = drizzle(client, { schema });
    
    // Create reportSources table if it doesn't exist
    console.log('Creating reportSources table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_sources (
        id UUID PRIMARY KEY NOT NULL,
        vendor TEXT NOT NULL,
        source_type TEXT NOT NULL,
        email_subject TEXT,
        email_from TEXT,
        email_date TIMESTAMP,
        file_path TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_report_sources_vendor ON report_sources(vendor);
      CREATE INDEX IF NOT EXISTS idx_report_sources_source_type ON report_sources(source_type);
      CREATE INDEX IF NOT EXISTS idx_report_sources_created_at ON report_sources(created_at);
    `);
    console.log('reportSources table created or already exists');
    
    // Create reports table if it doesn't exist
    console.log('Creating reports table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY NOT NULL,
        source_id UUID NOT NULL REFERENCES report_sources(id),
        report_data JSONB NOT NULL,
        record_count INTEGER NOT NULL,
        vendor TEXT NOT NULL,
        report_date TIMESTAMP,
        report_type TEXT,
        status TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_reports_source_id ON reports(source_id);
      CREATE INDEX IF NOT EXISTS idx_reports_vendor ON reports(vendor);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_report_date ON reports(report_date);
    `);
    console.log('reports table created or already exists');
    
    // Create insights table if it doesn't exist
    console.log('Creating insights table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS insights (
        id UUID PRIMARY KEY NOT NULL,
        report_id UUID NOT NULL REFERENCES reports(id),
        insight_data JSONB NOT NULL,
        prompt_version TEXT,
        overall_score INTEGER,
        quality_scores JSONB,
        business_impact JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_insights_report_id ON insights(report_id);
      CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at);
    `);
    console.log('insights table created or already exists');
    
    // Create insight_distributions table if it doesn't exist
    console.log('Creating insight_distributions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS insight_distributions (
        id UUID PRIMARY KEY NOT NULL,
        insight_id UUID NOT NULL REFERENCES insights(id),
        recipient_email TEXT NOT NULL,
        recipient_role TEXT,
        distribution_date TIMESTAMP,
        email_sent BOOLEAN DEFAULT FALSE,
        email_sent_date TIMESTAMP,
        email_status TEXT,
        email_log_id UUID,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_insight_distributions_insight_id ON insight_distributions(insight_id);
      CREATE INDEX IF NOT EXISTS idx_insight_distributions_recipient_email ON insight_distributions(recipient_email);
      CREATE INDEX IF NOT EXISTS idx_insight_distributions_email_sent ON insight_distributions(email_sent);
    `);
    console.log('insight_distributions table created or already exists');
    
    // Create historical_metrics table if it doesn't exist
    console.log('Creating historical_metrics table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS historical_metrics (
        id UUID PRIMARY KEY NOT NULL,
        vendor TEXT NOT NULL,
        metric_date TIMESTAMP NOT NULL,
        metric_type TEXT NOT NULL,
        metric_value JSONB NOT NULL,
        source TEXT NOT NULL,
        source_id UUID,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_historical_metrics_vendor ON historical_metrics(vendor);
      CREATE INDEX IF NOT EXISTS idx_historical_metrics_metric_date ON historical_metrics(metric_date);
      CREATE INDEX IF NOT EXISTS idx_historical_metrics_metric_type ON historical_metrics(metric_type);
    `);
    console.log('historical_metrics table created or already exists');
    
    // Create report_processing_jobs table if it doesn't exist
    console.log('Creating report_processing_jobs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_processing_jobs (
        id UUID PRIMARY KEY NOT NULL,
        report_id UUID NOT NULL REFERENCES reports(id),
        job_type TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        result JSONB,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_report_processing_jobs_report_id ON report_processing_jobs(report_id);
      CREATE INDEX IF NOT EXISTS idx_report_processing_jobs_job_type ON report_processing_jobs(job_type);
      CREATE INDEX IF NOT EXISTS idx_report_processing_jobs_status ON report_processing_jobs(status);
    `);
    console.log('report_processing_jobs table created or already exists');
    
    console.log('Schema push completed successfully');
    
    // Close database connection
    await client.end();
    
  } catch (error) {
    console.error('Error pushing schema to database:', error);
    process.exit(1);
  }
}

// Run schema push
pushReportSchema();