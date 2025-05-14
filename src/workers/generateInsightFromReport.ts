import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { db } from '../shared/db';
import { generateInsights } from '../services/aiInsightService';
import { reports, insights } from '../shared/report-schema';

interface GenerateInsightOptions {
  role?: 'Executive' | 'Sales' | 'Lot';
  saveResults?: boolean;
  evaluateQuality?: boolean;
  assessBusinessImpact?: boolean;
}

/**
 * Generate insights from a report
 */
export async function generateInsightFromReport(data: {
  reportId: string;
  platform: string;
  options?: GenerateInsightOptions;
}): Promise<any> {
  const startTime = Date.now();
  const { reportId, platform, options = {} } = data;
  
  try {
    if (!reportId) {
      throw new Error('Missing reportId in job data');
    }
    if (!platform) {
      throw new Error('Missing platform in job data');
    }

    logger.info(
      {
        event: 'insight_generation_started',
        reportId,
        platform,
        timestamp: new Date().toISOString(),
      },
      `Generating insights for report ${reportId}`
    );

    // Get report data from database
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, reportId)
    });

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    // Generate insights using our AI service
    const insightResult = await generateInsights(report.reportData, {
      role: options.role || 'Executive',
      maxRetries: 3
    });

    // Save to database
    const insightId = uuidv4();
    await db.insert(insights).values({
      id: insightId,
      reportId,
      insightData: insightResult,
      promptVersion: 'v1.0.0', // This should come from the prompt eventually
      overallScore: null, // This would be set if quality evaluation is enabled
      qualityScores: null,
      businessImpact: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Calculate duration
    const duration = Date.now() - startTime;

    // Log success
    logger.info(
      {
        event: 'insight_generated',
        reportId,
        platform,
        insightId,
        duration,
        timestamp: new Date().toISOString(),
      },
      `Generated insights for report ${reportId} with ID ${insightId}`
    );

    return {
      insightId,
      timestamp: new Date().toISOString(),
      reportId,
      platform,
      insightData: insightResult,
      duration
    };

  } catch (error) {
    // Log error with proper error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(
      {
        event: 'insight_generation_error',
        reportId,
        platform,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error generating insights: ${errorMessage}`
    );
    
    throw error;
  }
}