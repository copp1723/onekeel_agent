/**
 * Insight Scorer
 *
 * This module provides functionality to evaluate the quality of generated insights
 * using an LLM-based scoring approach. This helps benchmark different prompt
 * versions and track insight quality over time.
 */
import { type InsightResponse } from './generateInsightsFromCSV.js';
/**
 * Structure for insight quality score and feedback
 */
export interface InsightQualityScore {
    score: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    timestamp: string;
}
/**
 * Scores the quality of a generated insight using LLM evaluation
 * @param insight - The insight to score
 * @returns Quality score and feedback
 */
export declare function scoreInsightQuality(insight: InsightResponse): Promise<InsightQualityScore>;
