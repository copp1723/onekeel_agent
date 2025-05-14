import { OpenAI } from 'openai';
import { createCircuitBreaker } from '../utils/circuitBreaker';
import { logger } from '../utils/logger';
import { db } from '../utils/db';

// Initialize OpenAI client with validation
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not configured');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Circuit breaker configuration
const insightBreaker = createCircuitBreaker('insight-generation', {
  failureThreshold: 5,
  recoveryTimeout: 5 * 60 * 1000, // 5 minutes
});

interface InsightGenerationOptions {
  role?: 'Executive' | 'Sales' | 'Lot';
  maxRetries?: number;
}

interface InsightResult {
  summary: string;
  value_insights: string[];
  actionable_flags: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Generate role-specific insights from report data
 */
export async function generateInsights(
  reportData: any,
  options: InsightGenerationOptions = {}
): Promise<InsightResult> {
  const { role = 'Executive', maxRetries = 3 } = options;

  // Load role-specific prompt
  const prompt = await loadRolePrompt(role);

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      // Check circuit breaker
      await insightBreaker.beforeRequest();

      const startTime = Date.now();

      // Call OpenAI with streaming
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompt.system },
          {
            role: 'user',
            content: JSON.stringify(reportData),
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);

      // Log successful request (with redacted API key)
      await logInsightGeneration({
        success: true,
        duration: Date.now() - startTime,
        role,
        prompt_version: prompt.version,
      });

      return result as InsightResult;
    } catch (error) {
      lastError = error as Error;
      attempt++;

      // Log failure
      await logInsightGeneration({
        success: false,
        error: error.message,
        role,
      });

      if (attempt === maxRetries) {
        insightBreaker.recordFailure();
        throw new Error(
          `Failed to generate insights after ${maxRetries} attempts: ${error.message}`
        );
      }

      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  throw lastError || new Error('Failed to generate insights');
}

/**
 * Load role-specific prompt template
 */
async function loadRolePrompt(role: string) {
  // In a full implementation, this would load from a DB or filesystem
  // For now, return basic prompt structure
  return {
    version: 'v1.0.0',
    system: `You are an expert automotive dealership analyst providing data-driven insights for ${role} level decision making. Your insights should be clear, actionable, and focused on business impact.

Your response must be a JSON object with this structure:
{
  "summary": "A concise 1-2 sentence overview of the key finding",
  "value_insights": ["Specific insight with metrics", "Another insight..."],
  "actionable_flags": ["Recommended action", "Another action..."],
  "confidence": "high" | "medium" | "low"
}`,
  };
}

/**
 * Log insight generation attempt to DB
 */
async function logInsightGeneration(data: {
  success: boolean;
  duration?: number;
  error?: string;
  role: string;
  prompt_version?: string;
}) {
  try {
    await db.execute(
      'INSERT INTO insight_logs (success, duration_ms, error, role, prompt_version) VALUES ($1, $2, $3, $4, $5)',
      [
        data.success,
        data.duration || null,
        data.error || null,
        data.role,
        data.prompt_version || null,
      ]
    );
  } catch (error) {
    logger.error('Failed to log insight generation:', error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
