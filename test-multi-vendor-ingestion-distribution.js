/**
 * Multi-Vendor Ingestion and Distribution Test
 * 
 * This script tests the complete flow:
 * 1. Ingests reports from multiple vendors via email
 * 2. Processes reports and generates insights
 * 3. Distributes insights to appropriate stakeholders
 * 
 * Usage: node test-multi-vendor-ingestion-distribution.js <vendor>
 * Example: node test-multi-vendor-ingestion-distribution.js VinSolutions
 */

import { db } from './src/server/db.js';
import multiVendorEmailIngestion from './src/services/multiVendorEmailIngestion.js';
import { generateEnhancedInsights } from './src/services/enhancedInsightGenerator.js';
import { distributeInsights } from './src/services/insightDistributionService.js';
import { v4 as uuidv4 } from 'uuid';

// Create a delay function for testing
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Main test function
 */
async function testMultiVendorSystem() {
  try {
    console.log('\n=== MULTI-VENDOR EMAIL INGESTION & DISTRIBUTION TEST ===\n');
    
    // Get vendor from command line or use default
    const vendor = process.argv[2] || 'VinSolutions';
    console.log(`Testing with vendor: ${vendor}`);
    
    // Step 1: Create required database tables
    console.log('\n--- Step 1: Creating database tables ---');
    await createDatabaseTables();
    console.log('Database tables created');
    
    // Step 2: Generate sample report for testing
    console.log('\n--- Step 2: Generating sample report data ---');
    const reportResult = await multiVendorEmailIngestion.createSampleReportData(vendor);
    console.log(`Sample report created with ID: ${reportResult.reportId}`);
    console.log(`Report contains ${reportResult.recordCount} records`);
    
    // Step 3: Generate enhanced insights
    console.log('\n--- Step 3: Generating enhanced insights ---');
    const startTime = Date.now();
    const insights = await generateEnhancedInsights(reportResult.reportId, {
      includeBusinessImpact: true,
      includeTrendAnalysis: true
    });
    const insightTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`Enhanced insights generated in ${insightTime}s`);
    console.log(`Overall quality score: ${insights.qualityScores.overall}`);
    
    if (insights.businessImpact) {
      console.log(`Business impact: ${insights.businessImpact.overallImpact.impactLevel} (${insights.businessImpact.overallImpact.score}/10)`);
      console.log(`Potential revenue impact: $${insights.businessImpact.revenueImpact.total}`);
    }
    
    // Wait a moment for insights to be saved properly
    await delay(500);
    
    // Step 4: Distribute insights to stakeholders
    console.log('\n--- Step 4: Distributing insights to stakeholders ---');
    const insightId = insights.metadata.insightId || await findInsightId(reportResult.reportId);
    
    if (!insightId) {
      throw new Error('Could not find insight ID');
    }
    
    const distributionResult = await distributeInsights(insightId, {
      specificRoles: ['executive', 'sales', 'inventory'],
      distributionLevel: 'standard',
      sendEmails: true
    });
    
    console.log(`Created ${distributionResult.distributionsCreated} distribution records`);
    
    if (distributionResult.emailResults) {
      const successCount = distributionResult.emailResults.filter(r => r.success).length;
      console.log(`Sent ${successCount} of ${distributionResult.emailResults.length} emails successfully`);
    }
    
    // Step 5: Verify results
    console.log('\n--- Step 5: Verifying database records ---');
    const results = await verifyDatabaseRecords(reportResult.reportId, insightId);
    
    console.log('Database verification results:');
    console.log(`- Report source record: ${results.hasSource ? 'Found' : 'Not found'}`);
    console.log(`- Report record: ${results.hasReport ? 'Found' : 'Not found'}`);
    console.log(`- Insight record: ${results.hasInsight ? 'Found' : 'Not found'}`);
    console.log(`- Distribution records: ${results.distributionCount} found`);
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.end?.();
  }
}

/**
 * Create the necessary database tables
 */
async function createDatabaseTables() {
  try {
    // Check if tables already exist
    const tableCheck = await db.execute(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'report_sources')"
    );
    
    const tablesExist = tableCheck && tableCheck[0] && tableCheck[0].exists;
    
    if (tablesExist) {
      console.log('Tables already exist, skipping creation');
      return;
    }
    
    // Create tables using direct SQL
    // report_sources table
    await db.execute(`
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
    
    // reports table
    await db.execute(`
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
    
    // insights table
    await db.execute(`
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
    
    // insight_distributions table
    await db.execute(`
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
    
    // historical_metrics table
    await db.execute(`
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
    
    // report_processing_jobs table
    await db.execute(`
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
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

/**
 * Find the insight ID for a report
 */
async function findInsightId(reportId) {
  try {
    const results = await db.execute(
      'SELECT id FROM insights WHERE report_id = $1 ORDER BY created_at DESC LIMIT 1',
      [reportId]
    );
    
    if (results && results.length > 0) {
      return results[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding insight ID:', error);
    return null;
  }
}

/**
 * Verify that all expected database records were created
 */
async function verifyDatabaseRecords(reportId, insightId) {
  try {
    // Check for report source
    const sourceResult = await db.execute(
      'SELECT COUNT(*) as count FROM report_sources WHERE id IN (SELECT source_id FROM reports WHERE id = $1)',
      [reportId]
    );
    const hasSource = sourceResult[0].count > 0;
    
    // Check for report
    const reportResult = await db.execute(
      'SELECT COUNT(*) as count FROM reports WHERE id = $1',
      [reportId]
    );
    const hasReport = reportResult[0].count > 0;
    
    // Check for insight
    const insightResult = await db.execute(
      'SELECT COUNT(*) as count FROM insights WHERE id = $1',
      [insightId]
    );
    const hasInsight = insightResult[0].count > 0;
    
    // Check for distributions
    const distributionResult = await db.execute(
      'SELECT COUNT(*) as count FROM insight_distributions WHERE insight_id = $1',
      [insightId]
    );
    const distributionCount = distributionResult[0].count;
    
    return {
      hasSource,
      hasReport,
      hasInsight,
      distributionCount
    };
  } catch (error) {
    console.error('Error verifying database records:', error);
    return {
      hasSource: false,
      hasReport: false,
      hasInsight: false,
      distributionCount: 0
    };
  }
}

// Run the test
testMultiVendorSystem();