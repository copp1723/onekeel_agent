import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { db } from '../shared/db.js';
import { generateInsights } from '../services/aiInsightService.js';
import { reports, insights } from '../shared/report-schema.js';
import { taskLogs } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { isError } from '../utils/errorUtils.js';
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
  taskId?: string;
  options?: GenerateInsightOptions;
}): Promise<{
  insightId: string;
  timestamp: string;
  reportId: string;
  platform: string;
  insightData: any;
  duration: number;
}> {
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
      where: eq(reports.id, reportId.toString())
    });
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }
    // Generate insights using our AI service
    const role = options.role || 'Executive';
    logger.info(
      {
        event: 'insight_generation_request',
        reportId,
        platform,
        role,
      },
      `Requesting insights for report ${reportId} with role ${role}`
    );
    const insightResult = await generateInsights(report.reportData, {
      role,
      maxRetries: 3
    });
    // Get prompt version from the result (if available)
    // The prompt version is returned by the aiInsightService
    const promptVersion = insightResult.prompt_version || 'v1.0.0';
    // Save to database
    const insightId = uuidv4();
    await db.insert(insights).values({
      id: insightId,
      reportId,
      insightData: insightResult,
      promptVersion,
      overallScore: options.evaluateQuality ? 0 : null, // Will be updated if quality evaluation is enabled
      qualityScores: null,
      businessImpact: null,
      createdAt: new Date(),
      updatedAt: new Date()
      } as any) // @ts-ignore - Ensuring all required properties are provided;
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
    let errorMessage = '';
    if (isError(error)) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }
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
    // If we have a task ID, update the task status to failed
    if (data.taskId) {
      try {
        await db
          .update(taskLogs)
          .set({
            status: 'failed',
            error: errorMessage,
            completedAt: new Date()
          })
          .where(eq(taskLogs.id, data.taskId.toString()));
      } catch (dbError) {
        const dbErrorMessage = isError(dbError) ? dbError.message : String(dbError);
        logger.error(
          {
            event: 'task_update_error',
            taskId: data.taskId,
            error: dbErrorMessage,
          },
          `Failed to update task status: ${dbErrorMessage}`
        );
      }
    }
    throw error;
  }
}