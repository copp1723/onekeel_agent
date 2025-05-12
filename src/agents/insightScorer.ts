/**
 * Insight Scorer
 * 
 * This module provides functionality to evaluate the quality of generated insights
 * using an LLM-based scoring approach. This helps benchmark different prompt
 * versions and track insight quality over time.
 */

import OpenAI from 'openai';
import { type InsightResponse } from './generateInsightsFromCSV.js';
import { logger } from '../shared/logger.js';

/**
 * Structure for insight quality score and feedback
 */
export interface InsightQualityScore {
  score: number;          // 0-10 score
  feedback: string;       // Detailed feedback
  strengths: string[];    // Specific strengths
  weaknesses: string[];   // Areas for improvement
  timestamp: string;      // When the scoring was performed
}

/**
 * System prompt for the scoring model
 */
const SCORING_SYSTEM_PROMPT = `You are an expert evaluator of business insights for automotive dealerships.
Your task is to score the quality of LLM-generated insights on a scale from 0 to 10.

Evaluation criteria:
1. Specificity - Are the insights specific to the dealership data rather than generic?
2. Actionability - Do the action items provide clear, concrete next steps?
3. Business value - Would these insights help a dealership improve performance?
4. Clarity - Is the analysis well-explained and easy to understand?
5. Data grounding - Are the insights clearly supported by the data?

Provide your evaluation as JSON with the following format:
{
  "score": 0-10,
  "feedback": "Your overall assessment",
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"]
}`;

/**
 * Scores the quality of a generated insight using LLM evaluation
 * @param insight - The insight to score
 * @returns Quality score and feedback
 */
export async function scoreInsightQuality(insight: InsightResponse): Promise<InsightQualityScore> {
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Convert insight to string for evaluation
    const insightStr = JSON.stringify(insight, null, 2);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: 'system', content: SCORING_SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Please evaluate the quality of this insight:\n\n${insightStr}`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in scoring response');
    }
    
    // Parse the JSON response and add timestamp
    const scoreData = JSON.parse(content) as Omit<InsightQualityScore, 'timestamp'>;
    const result: InsightQualityScore = {
      ...scoreData,
      timestamp: new Date().toISOString()
    };
    
    // Validate score is in range 0-10
    result.score = Math.max(0, Math.min(10, result.score));
    
    // Log the scoring result
    logger.info(`Insight scored ${result.score}/10`, {
      score: result.score,
      feedback: result.feedback
    });
    
    return result;
  } catch (error) {
    logger.error('Error scoring insight quality:', error);
    
    // Return a default score on error
    return {
      score: -1,
      feedback: 'Error scoring insight: ' + (error instanceof Error ? error.message : String(error)),
      strengths: [],
      weaknesses: ['Could not be evaluated due to scoring error'],
      timestamp: new Date().toISOString()
    };
  }
}