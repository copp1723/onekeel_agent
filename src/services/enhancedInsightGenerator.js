/**
 * Enhanced Insight Generator Service
 * 
 * This service handles the generation of enhanced business insights from CRM data
 * using specialized prompts and quality evaluation.
 * 
 * Key features:
 * - Supports multiple data sources and platforms (VinSolutions, VAUTO, DealerTrack)
 * - Generates structured insights with quality scoring
 * - Uses prompt versioning to track insight generation
 * - Saves insights with metadata for traceability
 */

import fs from 'fs/promises';
import path from 'path';
import { executePrompt } from '../utils/promptEngine.js';

// Constants
const RESULTS_DIR = path.join(process.cwd(), 'results');

/**
 * Generate enhanced insights from CRM data
 * 
 * @param {Object} data - The CRM data to analyze
 * @param {string} platform - The platform source (e.g., VinSolutions, VAUTO)
 * @param {Object} options - Additional options for insight generation
 * @returns {Promise<Object>} The generated insights with quality evaluation
 */
export async function generateEnhancedInsights(data, platform, options = {}) {
  try {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    
    // Create a unique ID for this insight run
    const insightRunId = `${platform}-${dateStr}-${Date.now()}`;
    
    // Prepare data summary for metadata
    const dataSummary = {
      platform,
      timestamp,
      recordCount: Array.isArray(data) ? data.length : 1,
      dataFields: Object.keys(Array.isArray(data) ? data[0] || {} : data).slice(0, 10)
    };
    
    console.log(`Generating insights for ${platform} data with ${dataSummary.recordCount} records`);
    
    // Step 1: Generate primary insights using automotive-analyst prompt
    const primaryInsights = await executePrompt('automotive-analyst', { 
      data: JSON.stringify(data, null, 2)
    }, { verbose: options.verbose });
    
    // Store metadata about the prompt version used
    const insightMetadata = {
      platform,
      timestamp,
      promptName: 'automotive-analyst',
      promptVersion: primaryInsights.meta.promptVersion,
      executionTime: primaryInsights.meta.executionTime,
      tokenUsage: primaryInsights.meta.totalTokens,
      dataSummary
    };
    
    // Step 2: Evaluate the quality of the generated insights
    const qualityEvaluation = await executePrompt('quality-evaluation', {
      insights: JSON.stringify(primaryInsights.result, null, 2),
      data: JSON.stringify(data, null, 2)
    }, { verbose: options.verbose });
    
    // Step 3: Generate business impact assessment
    const businessImpact = await executePrompt('business-impact', {
      insights: JSON.stringify(primaryInsights.result, null, 2),
      data: JSON.stringify(data, null, 2)
    }, { verbose: options.verbose });
    
    // Step 4: Generate visualization recommendations
    const visualizationRecommendations = await executePrompt('visualization-enhanced', {
      insights: JSON.stringify(primaryInsights.result, null, 2),
      data: JSON.stringify(data, null, 2)
    }, { verbose: options.verbose });
    
    // Combine all results
    const enhancedInsights = {
      insights: primaryInsights.result,
      quality: qualityEvaluation.result,
      business_impact: businessImpact.result,
      visualizations: visualizationRecommendations.result,
      metadata: insightMetadata
    };
    
    // Save the insights to disk if not disabled
    if (!options.skipSave) {
      await saveInsights(platform, dateStr, insightRunId, enhancedInsights);
    }
    
    return enhancedInsights;
  } catch (error) {
    console.error('Error generating insights:', error.message);
    throw new Error(`Failed to generate insights: ${error.message}`);
  }
}

/**
 * Generate role-specific insights for a particular stakeholder type
 * 
 * @param {Object} enhancedInsights - The complete enhanced insights
 * @param {string} role - The stakeholder role (EXECUTIVE, SALES_MANAGER, MARKETING)
 * @returns {Promise<Object>} Role-specific adapted insights
 */
export async function generateRoleSpecificInsights(enhancedInsights, role) {
  try {
    // Validate role
    const validRoles = ['EXECUTIVE', 'SALES_MANAGER', 'MARKETING'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }
    
    // Generate role-specific insights using tone-adaptive prompt
    const roleInsights = await executePrompt('tone-adaptive', {
      role,
      insights: JSON.stringify(enhancedInsights.insights, null, 2),
      data: JSON.stringify(enhancedInsights.metadata.dataSummary, null, 2)
    });
    
    // Return role-adapted insights with relevant visualizations
    return {
      adapted_insights: roleInsights.result,
      recommended_visualizations: enhancedInsights.visualizations.primary_visualizations.slice(0, 2),
      business_impact: {
        revenue_impact: enhancedInsights.business_impact.revenue_impact,
        customer_impact: enhancedInsights.business_impact.customer_impact,
        implementation_priorities: enhancedInsights.business_impact.implementation_priorities.slice(0, 3)
      },
      metadata: {
        role,
        generatedAt: new Date().toISOString(),
        platform: enhancedInsights.metadata.platform,
        qualityScore: enhancedInsights.quality.overall_score
      }
    };
  } catch (error) {
    console.error(`Error generating role-specific insights for ${role}:`, error.message);
    throw new Error(`Failed to generate role-specific insights: ${error.message}`);
  }
}

/**
 * Save insights to disk for record keeping
 * 
 * @param {string} platform - The data platform
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} insightRunId - Unique ID for this insight run
 * @param {Object} insights - The insights to save
 * @returns {Promise<string>} The path where insights were saved
 */
async function saveInsights(platform, dateStr, insightRunId, insights) {
  try {
    // Create platform and date directories if needed
    const platformDir = path.join(RESULTS_DIR, platform);
    const dateDir = path.join(platformDir, dateStr);
    
    await fs.mkdir(platformDir, { recursive: true });
    await fs.mkdir(dateDir, { recursive: true });
    
    // Save the insights to a JSON file
    const filePath = path.join(dateDir, `${insightRunId}.json`);
    await fs.writeFile(filePath, JSON.stringify(insights, null, 2), 'utf-8');
    
    console.log(`Insights saved to ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error saving insights:', error.message);
    // We don't throw here as this is a non-critical failure
    return null;
  }
}

/**
 * List all available insights for a platform
 * 
 * @param {string} platform - The platform to list insights for
 * @returns {Promise<Array<Object>>} Array of available insights with metadata
 */
export async function listAvailableInsights(platform) {
  try {
    const platformDir = path.join(RESULTS_DIR, platform);
    
    // Check if platform directory exists
    try {
      await fs.access(platformDir);
    } catch (error) {
      return []; // Return empty array if directory doesn't exist
    }
    
    // Get list of date directories
    const dateDirs = await fs.readdir(platformDir);
    
    // Get insights from all date directories
    const insights = [];
    
    for (const dateDir of dateDirs) {
      const fullDateDir = path.join(platformDir, dateDir);
      
      // Skip if not a directory
      const stats = await fs.stat(fullDateDir);
      if (!stats.isDirectory()) continue;
      
      // Get insight files
      const files = await fs.readdir(fullDateDir);
      const insightFiles = files.filter(file => file.endsWith('.json'));
      
      // Load metadata for each insight
      for (const file of insightFiles) {
        const filePath = path.join(fullDateDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const insightData = JSON.parse(fileContent);
        
        insights.push({
          id: path.basename(file, '.json'),
          date: dateDir,
          platform,
          path: filePath,
          metadata: insightData.metadata,
          quality: insightData.quality ? {
            overall_score: insightData.quality.overall_score,
            quality_dimensions: insightData.quality.quality_dimensions
          } : null
        });
      }
    }
    
    // Sort by date (most recent first)
    insights.sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp));
    
    return insights;
  } catch (error) {
    console.error(`Error listing insights for ${platform}:`, error.message);
    return [];
  }
}