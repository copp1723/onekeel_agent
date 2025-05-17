/**
 * Insight Generator Service
 *
 * Generates insights from parsed data using LLM-based analysis
 * and stores results in the database with metadata.
 */
import fs from 'fs';
import { isError } from '../../../../utils/errorUtils.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';
import { db } from '../../../../shared/db.js';
import { insights } from '../../../../shared/report-schema.js';
import { ParserResult } from './attachmentParsers.js';
import { z } from 'zod';
// Define the insight response schema
export const InsightResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  summary: z.string(),
  actionItems: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(['high', 'medium', 'low']).optional(),
      impact: z.string().optional(),
    })
  ),
  metrics: z
    .array(
      z.object({
        name: z.string(),
        value: z.union([z.string(), z.number()]),
        change: z.string().optional(),
        trend: z.enum(['up', 'down', 'stable']).optional(),
      })
    )
    .optional(),
  charts: z
    .array(
      z.object({
        title: z.string(),
        type: z.enum(['bar', 'line', 'pie', 'scatter']),
        data: z.record(z.string(), z.any()),
        xAxisLabel: z.string().optional(),
        yAxisLabel: z.string().optional(),
      })
    )
    .optional(),
});
// Type for insight response
export type InsightResponse = z.infer<typeof InsightResponseSchema>;
// Type for insight run log data
export interface InsightRunLogData {
  platform: string;
  promptIntent: string;
  promptVersion: string;
  durationMs: number;
  outputSummary: string[];
  error?: string;
}
// Type for insight generation options
export interface InsightGenerationOptions {
  intent?: string;
  promptVersion?: string;
  modelVersion?: string;
  sampleSize?: number;
  includeCharts?: boolean;
}
// Prompt templates for different intents
const PROMPT_TEMPLATES: Record<string, { text: string; version: string }> = {
  automotive_analysis: {
    text: `You are an expert automotive dealership analyst. Your task is to analyze CRM data from a car dealership and provide actionable insights.
Focus on:
1. Sales performance trends
2. Lead conversion rates
3. Inventory aging
4. Sales rep performance
5. Customer demographics
6. Marketing channel effectiveness
Provide your analysis in a structured format with:
- A clear title summarizing the main insight
- A detailed description of what you found
- A concise summary (1-2 sentences)
- 3-5 specific, actionable recommendations
- Key metrics with values and trends
- Charts that would help visualize the data (describe what they would show)
Your insights should be specific, data-driven, and actionable for dealership management.`,
    version: '2.0.0',
  },
  inventory_analysis: {
    text: `You are an expert automotive inventory analyst. Your task is to analyze inventory data from a car dealership and provide actionable insights.
Focus on:
1. Inventory aging and turnover
2. Popular models and configurations
3. Pricing strategy effectiveness
4. Inventory mix optimization
5. Seasonal trends
6. Competitive positioning
Provide your analysis in a structured format with:
- A clear title summarizing the main insight
- A detailed description of what you found
- A concise summary (1-2 sentences)
- 3-5 specific, actionable recommendations
- Key metrics with values and trends
- Charts that would help visualize the data (describe what they would show)
Your insights should be specific, data-driven, and actionable for inventory managers.`,
    version: '1.5.0',
  },
};
/**
 * Log insight generation run
 * @param logData - Insight run log data
 */
export function logInsightRun(logData: InsightRunLogData): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...logData,
  };
  console.log(
    `[INSIGHT RUN] ${timestamp} - ${logData.platform!} - ${logData.promptIntent} - ${logData.durationMs}ms`
  );
  // Create logs directory if it doesn't exist
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  // Append to log file
  const logFile = path.join(logsDir, 'insight-runs.jsonl');
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}
/**
 * Save insight result to file
 * @param platform - Platform name
 * @param insightData - Insight data
 * @param filename - Filename
 * @param metadata - Metadata
 * @returns Path to the saved file
 */
export function saveResult(
  platform: string,
  insightData: InsightResponse,
  filename: string,
  metadata: Record<string, any>
): string {
  // Create insights directory if it doesn't exist
  const insightsDir = path.join(process.cwd(), 'insights');
  if (!fs.existsSync(insightsDir)) {
    fs.mkdirSync(insightsDir, { recursive: true });
  }
  // Create platform directory if it doesn't exist
  const platformDir = path.join(insightsDir, platform);
  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true });
  }
  // Create result object
  const result = {
    insight: insightData,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      platform,
    },
  };
  // Save to file
  const filePath = path.join(platformDir, `${filename}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  return filePath;
}
/**
 * Store insight in database
 * @param reportId - Report ID
 * @param insightData - Insight data
 * @param metadata - Metadata
 * @returns Insight ID
 */
export async function storeInsight(
  reportId: string,
  insightData: InsightResponse,
  metadata: {
    promptVersion: string;
    modelVersion: string;
    durationMs: number;
    overallScore?: number;
    qualityScores?: Record<string, any>;
    businessImpact?: Record<string, any>;
  }
): Promise<string> {
  const insightId = uuidv4();
  await db.insert(insights).values({
    id: insightId,
    reportId,
    insightData,
    promptVersion: metadata.promptVersion,
    overallScore: metadata.overallScore || null,
    qualityScores: metadata.qualityScores || null,
    businessImpact: metadata.businessImpact || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any); // @ts-ignore - Ensuring all required properties are provided;
  console.log(`Stored insight: ${insightId}`);
  return insightId;
}
/**
 * Generate insights from parsed data
 * @param data - Parsed data
 * @param platform - Platform name
 * @param options - Generation options
 * @returns Generated insights
 */
export async function generateInsights(
  data: ParserResult,
  platform: string,
  options: InsightGenerationOptions = {}
): Promise<{
  insightId: string;
  insight: InsightResponse;
  metadata: Record<string, any>;
}> {
  // Set default options
  const intent = options.intent! || 'automotive_analysis';
  const promptInfo = PROMPT_TEMPLATES[intent] || PROMPT_TEMPLATES.automotive_analysis;
  const modelVersion = options.modelVersion || 'gpt-4o';
  const sampleSize = options.sampleSize || Math.min(100, data.records.length);
  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // Start timing
  const startTime = Date.now();
  try {
    // Prepare sample data
    const sampleData = JSON.stringify(data.records.slice(0, sampleSize), null, 2);
    // Generate insights
    const response = await openai.chat.completions.create({
      model: modelVersion,
      messages: [
        { role: 'system', content: promptInfo.text },
        {
          role: 'user',
          content: `Here is a validated CRM export from an automotive dealership. Please analyze this data and provide insights:\n\n${sampleData}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    // Calculate duration
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Failed to generate insights: Empty response from OpenAI');
    }
    // Parse and validate JSON response
    const rawInsightData = JSON.parse(content);
    const insightData = InsightResponseSchema.parse(rawInsightData);
    // Log the insight run
    const insightRunData: InsightRunLogData = {
      platform,
      promptIntent: intent,
      promptVersion: promptInfo.version,
      durationMs,
      outputSummary: [insightData.title],
    };
    logInsightRun(insightRunData);
    // Save result to file
    const outputFilename = `insight_${Date.now()}`;
    const outputPath = saveResult(platform, insightData, outputFilename, {
      promptIntent: intent,
      promptVersion: promptInfo.version,
      durationMs,
      sampleSize,
      modelVersion,
    });
    // Store in database
    const metadata = {
      promptVersion: promptInfo.version,
      modelVersion,
      durationMs,
      filePath: outputPath,
    };
    const insightId = await storeInsight(data.id, insightData, metadata);
    return {
      insightId,
      insight: insightData,
      metadata: {
        ...metadata,
        platform,
        intent,
        sampleSize,
        outputPath,
      },
    };
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
    // Log error
    const insightRunData: InsightRunLogData = {
      platform,
      promptIntent: intent,
      promptVersion: promptInfo.version,
      durationMs: Date.now() - startTime,
      outputSummary: [],
      error: errorMessage,
    };
    logInsightRun(insightRunData);
    console.error('Error generating insights:', error);
    throw error;
  }
}
export default {
  generateInsights,
  logInsightRun,
  saveResult,
  storeInsight,
};
