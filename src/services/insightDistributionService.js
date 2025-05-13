/**
 * Insight Distribution Service
 * 
 * This service handles the distribution of insights to different stakeholders
 * based on their roles and notification preferences. It supports different
 * delivery channels (email, dashboard, API) and scheduling options.
 * 
 * Key features:
 * - Role-based insight distribution (EXECUTIVE, SALES_MANAGER, MARKETING)
 * - Scheduled delivery with configurable frequency
 * - Email notifications with appropriate content formatting
 * - Support for multiple delivery channels
 * - Distribution history tracking
 */

import fs from 'fs/promises';
import path from 'path';
import { sendEmail } from './mailerService.js';
import { executePrompt } from '../utils/promptEngine.js';

// Constants for delivery frequency
export const DELIVERY_FREQUENCY = {
  IMMEDIATE: 'IMMEDIATE',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY'
};

// Constants for distribution channels
export const DISTRIBUTION_CHANNEL = {
  EMAIL: 'EMAIL',
  DASHBOARD: 'DASHBOARD',
  API: 'API',
  FILE: 'FILE'
};

/**
 * Initialize a new distribution configuration for a stakeholder
 * 
 * @param {string} email - Stakeholder's email address
 * @param {string} role - Stakeholder's role (EXECUTIVE, SALES_MANAGER, MARKETING)
 * @param {string} name - Stakeholder's name
 * @param {Array<string>} platforms - Array of platforms to receive insights for
 * @param {Array<string>} channels - Array of distribution channels
 * @param {string} frequency - Delivery frequency
 * @returns {Object} Distribution configuration
 */
export function createDistributionConfig(email, role, name, platforms = [], channels = [], frequency = DELIVERY_FREQUENCY.WEEKLY) {
  return {
    email,
    role,
    name,
    platforms: platforms.length > 0 ? platforms : ['ALL'],
    channels: channels.length > 0 ? channels : [DISTRIBUTION_CHANNEL.EMAIL],
    frequency,
    lastDistributed: null,
    active: true
  };
}

/**
 * Distribute insights to a specific stakeholder based on their configuration
 * 
 * @param {Object} enhancedInsights - The enhanced insights to distribute
 * @param {Object} distributionConfig - The stakeholder's distribution configuration
 * @returns {Promise<Object>} Distribution result
 */
export async function distributeInsights(enhancedInsights, distributionConfig) {
  try {
    // Check if insights should be distributed based on frequency
    if (!shouldDistributeByFrequency(distributionConfig)) {
      return {
        success: true,
        message: `Skipped distribution based on frequency setting: ${distributionConfig.frequency}`,
        distribution: {
          config: distributionConfig,
          timestamp: new Date().toISOString(),
          skipped: true
        }
      };
    }
    
    // Check platform matching
    const platform = enhancedInsights.metadata.platform;
    if (!distributionConfig.platforms.includes('ALL') && !distributionConfig.platforms.includes(platform)) {
      return {
        success: true,
        message: `Skipped distribution for platform ${platform} based on stakeholder configuration`,
        distribution: {
          config: distributionConfig,
          timestamp: new Date().toISOString(),
          skipped: true
        }
      };
    }
    
    // Generate role-specific insights
    const roleInsights = await generateRoleSpecificInsights(enhancedInsights, distributionConfig.role);
    
    // Distribute through each channel
    const channelResults = [];
    const distributionPromises = [];
    
    for (const channel of distributionConfig.channels) {
      console.log(`Distributing insights via ${channel} to ${distributionConfig.role} (${distributionConfig.name})`);
      
      let channelPromise;
      switch (channel) {
        case DISTRIBUTION_CHANNEL.EMAIL:
          channelPromise = distributeViaEmail(roleInsights, distributionConfig);
          break;
        case DISTRIBUTION_CHANNEL.DASHBOARD:
          channelPromise = distributeViaDashboard(roleInsights, distributionConfig);
          break;
        case DISTRIBUTION_CHANNEL.API:
          channelPromise = distributeViaAPI(roleInsights, distributionConfig);
          break;
        case DISTRIBUTION_CHANNEL.FILE:
          channelPromise = distributeViaFile(roleInsights, distributionConfig);
          break;
      }
      
      distributionPromises.push(channelPromise.then(result => {
        channelResults.push({
          channel,
          success: result.success,
          message: result.message,
          ...result
        });
        return result;
      }));
    }
    
    await Promise.all(distributionPromises);
    
    // Update last distributed timestamp
    distributionConfig.lastDistributed = new Date().toISOString();
    
    // Return distribution results
    return {
      success: true,
      message: `Insights distributed to ${distributionConfig.name} (${distributionConfig.role})`,
      distribution: {
        config: distributionConfig,
        channelResults,
        timestamp: new Date().toISOString(),
        skipped: false
      }
    };
  } catch (error) {
    console.error('Error distributing insights:', error);
    return {
      success: false,
      message: `Failed to distribute insights: ${error.message}`,
      error
    };
  }
}

/**
 * Distribute insights via email
 * 
 * @param {Object} roleInsights - Role-specific insights
 * @param {Object} config - Distribution configuration
 * @returns {Promise<Object>} Email distribution result
 */
async function distributeViaEmail(roleInsights, config) {
  try {
    const { subject, html, text } = generateEmailContent(roleInsights, config);
    
    const emailResult = await sendEmail({
      to: config.email,
      subject,
      html,
      text
    });
    
    return {
      success: emailResult.success,
      message: emailResult.message,
      emailId: emailResult.emailId,
      previewUrl: emailResult.previewUrl
    };
  } catch (error) {
    console.error('Error distributing via email:', error);
    return {
      success: false,
      message: `Failed to distribute via email: ${error.message}`
    };
  }
}

/**
 * Generate email content for insights distribution
 * 
 * @param {Object} roleInsights - Role-specific insights
 * @param {Object} config - Distribution configuration
 * @returns {Object} Email content with HTML and plain text versions
 */
function generateEmailContent(roleInsights, config) {
  const platform = roleInsights.metadata.platform;
  const subject = `${platform} Insights for ${config.role === 'EXECUTIVE' ? 'Executive Leadership' : config.role === 'SALES_MANAGER' ? 'Sales Management' : 'Marketing Team'}`;
  
  // Generate HTML content
  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f5f5f5; padding: 15px; border-bottom: 3px solid #0066cc; }
          .header h1 { margin: 0; color: #0066cc; }
          .section { margin-top: 20px; }
          .section h2 { color: #0066cc; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .insight-item { padding: 10px; margin-bottom: 10px; border-left: 4px solid #0066cc; background-color: #f9f9f9; }
          .metrics { display: flex; flex-wrap: wrap; }
          .metric { flex: 1; min-width: 200px; padding: 10px; margin: 5px; background-color: #f0f8ff; border-radius: 5px; }
          .metric h3 { margin-top: 0; color: #0066cc; }
          .action-item { padding: 10px; margin-bottom: 10px; border-left: 4px solid #ff9900; background-color: #fffaf0; }
          .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>For: ${config.name}</p>
          </div>
          
          <div class="section">
            <h2>Summary</h2>
            <p>${roleInsights.summary}</p>
          </div>
    `;
    
  // Add key insights section
  html += `
    <div class="section">
      <h2>Key Insights</h2>
  `;
  
  roleInsights.value_insights.forEach(insight => {
    html += `<div class="insight-item">${insight}</div>`;
  });
  
  html += `</div>`;
  
  // Add key metrics section
  html += `
    <div class="section">
      <h2>Key Metrics</h2>
      <div class="metrics">
  `;
  
  for (const [key, value] of Object.entries(roleInsights.key_metrics)) {
    html += `
      <div class="metric">
        <h3>${key.replace(/_/g, ' ').toUpperCase()}</h3>
        <p>${value}</p>
      </div>
    `;
  }
  
  html += `
      </div>
    </div>
  `;
  
  // Add action items section
  html += `
    <div class="section">
      <h2>Recommended Actions</h2>
  `;
  
  roleInsights.actionable_flags.forEach(action => {
    html += `<div class="action-item">${action}</div>`;
  });
  
  html += `</div>`;
  
  // Add business impact section if available
  if (roleInsights.business_impact) {
    html += `
      <div class="section">
        <h2>Business Impact</h2>
        <div class="metrics">
          <div class="metric">
            <h3>REVENUE IMPACT</h3>
            <p>Potential: ${roleInsights.business_impact.revenue_impact.potential_gain}</p>
            <p>Confidence: ${roleInsights.business_impact.revenue_impact.confidence}</p>
          </div>
          <div class="metric">
            <h3>COST SAVINGS</h3>
            <p>Potential: ${roleInsights.business_impact.cost_impact.potential_savings}</p>
            <p>Confidence: ${roleInsights.business_impact.cost_impact.confidence}</p>
          </div>
          <div class="metric">
            <h3>CUSTOMER IMPACT</h3>
            <p>Impact: ${roleInsights.business_impact.customer_impact.impact_level}</p>
            <p>Description: ${roleInsights.business_impact.customer_impact.description}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  // Add visualization recommendations if available
  if (roleInsights.visualizations) {
    html += `
      <div class="section">
        <h2>Visualization Recommendations</h2>
        <p>${roleInsights.visualizations.recommendation}</p>
        <ul>
    `;
    
    roleInsights.visualizations.chart_types.forEach(chart => {
      html += `<li><strong>${chart.type}:</strong> ${chart.description}</li>`;
    });
    
    html += `
        </ul>
      </div>
    `;
  }
  
  // Add footer
  html += `
          <div class="footer">
            <p>This is an automated insight report. Please do not reply to this email.</p>
            <p>Generated by Automotive Insight Engine | Data platform: ${platform}</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  // Generate plain text version
  const text = `
${subject}
Generated on: ${new Date().toLocaleDateString()}
For: ${config.name}

SUMMARY
${roleInsights.summary}

KEY INSIGHTS
${roleInsights.value_insights.map(insight => `- ${insight}`).join('\n')}

KEY METRICS
${Object.entries(roleInsights.key_metrics).map(([key, value]) => `${key.replace(/_/g, ' ').toUpperCase()}: ${value}`).join('\n')}

RECOMMENDED ACTIONS
${roleInsights.actionable_flags.map(action => `- ${action}`).join('\n')}

${roleInsights.business_impact ? `
BUSINESS IMPACT
Revenue Potential: ${roleInsights.business_impact.revenue_impact.potential_gain} (Confidence: ${roleInsights.business_impact.revenue_impact.confidence})
Cost Savings: ${roleInsights.business_impact.cost_impact.potential_savings} (Confidence: ${roleInsights.business_impact.cost_impact.confidence})
Customer Impact: ${roleInsights.business_impact.customer_impact.impact_level} - ${roleInsights.business_impact.customer_impact.description}
` : ''}

This is an automated insight report. Please do not reply to this email.
Generated by Automotive Insight Engine | Data platform: ${platform}
  `;
  
  return { subject, html, text };
}

/**
 * Distribute insights via dashboard
 * 
 * @param {Object} roleInsights - Role-specific insights
 * @param {Object} config - Distribution configuration
 * @returns {Promise<Object>} Dashboard distribution result
 */
async function distributeViaDashboard(roleInsights, config) {
  // Dashboard integration would be implemented here
  // This is a placeholder implementation
  console.log(`Would distribute insights to dashboard for ${config.role}`);
  
  return {
    success: true,
    message: 'Insights would be distributed to dashboard (placeholder)'
  };
}

/**
 * Distribute insights via API
 * 
 * @param {Object} roleInsights - Role-specific insights
 * @param {Object} config - Distribution configuration
 * @returns {Promise<Object>} API distribution result
 */
async function distributeViaAPI(roleInsights, config) {
  // API integration would be implemented here
  // This is a placeholder implementation
  console.log(`Would distribute insights via API for ${config.role}`);
  
  return {
    success: true,
    message: 'Insights would be distributed via API (placeholder)'
  };
}

/**
 * Distribute insights via file system
 * 
 * @param {Object} roleInsights - Role-specific insights
 * @param {Object} config - Distribution configuration
 * @returns {Promise<Object>} File distribution result
 */
async function distributeViaFile(roleInsights, config) {
  try {
    const platform = roleInsights.metadata.platform;
    const dateStr = new Date().toISOString().split('T')[0];
    const dirPath = path.join('results', platform, dateStr, 'distributions', config.role.toLowerCase());
    const filename = `${platform}-${config.role.toLowerCase()}-${Date.now()}.json`;
    const filePath = path.join(dirPath, filename);
    
    // Create directory if it doesn't exist
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write insights to file
    await fs.writeFile(
      filePath, 
      JSON.stringify({
        distribution_config: config,
        timestamp: new Date().toISOString(),
        insights: roleInsights
      }, null, 2)
    );
    
    return {
      success: true,
      message: `Insights saved to ${filePath}`,
      filePath
    };
  } catch (error) {
    console.error('Error distributing via file:', error);
    return {
      success: false,
      message: `Failed to distribute via file: ${error.message}`
    };
  }
}

/**
 * Schedule insights distribution for multiple stakeholders
 * 
 * @param {Object} enhancedInsights - The enhanced insights to distribute
 * @param {Array<Object>} distributionConfigs - Array of stakeholder distribution configurations
 * @returns {Promise<Object>} Scheduled distribution results
 */
export async function scheduleDistribution(enhancedInsights, distributionConfigs) {
  const results = {
    success: true,
    distributions: [],
    timestamp: new Date().toISOString()
  };
  
  for (const config of distributionConfigs) {
    try {
      const result = await distributeInsights(enhancedInsights, config);
      results.distributions.push(result);
    } catch (error) {
      console.error(`Error distributing to ${config.role} (${config.name}):`, error);
      results.distributions.push({
        success: false,
        message: `Failed to distribute: ${error.message}`,
        config
      });
    }
  }
  
  return results;
}

/**
 * Determine if insights should be distributed based on frequency setting
 * 
 * @param {Object} config - Distribution configuration
 * @returns {boolean} True if insights should be distributed
 */
function shouldDistributeByFrequency(config) {
  if (config.frequency === DELIVERY_FREQUENCY.IMMEDIATE) {
    return true;
  }
  
  if (!config.lastDistributed) {
    return true;
  }
  
  const lastDate = new Date(config.lastDistributed);
  const now = new Date();
  const daysDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  
  switch (config.frequency) {
    case DELIVERY_FREQUENCY.DAILY:
      return daysDiff >= 1;
    case DELIVERY_FREQUENCY.WEEKLY:
      return daysDiff >= 7;
    case DELIVERY_FREQUENCY.MONTHLY:
      return daysDiff >= 30;
    default:
      return true;
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
    console.log(`Generating role-specific insights for ${role}...`);
    
    // If adapting insights with LLM
    // This could be expanded to use the tone-adaptive prompt
    
    // For now, we'll adapt insights by selecting relevant data only
    let adaptedInsights = { ...enhancedInsights };
    
    switch (role) {
      case 'EXECUTIVE':
        // Focus on high-level business impact and revenue
        adaptedInsights.value_insights = enhancedInsights.value_insights.filter(
          insight => insight.toLowerCase().includes('profit') || 
                     insight.toLowerCase().includes('revenue') || 
                     insight.toLowerCase().includes('cost') ||
                     insight.toLowerCase().includes('trend')
        );
        adaptedInsights.actionable_flags = enhancedInsights.actionable_flags.filter(
          action => action.toLowerCase().includes('strategy') || 
                    action.toLowerCase().includes('revenue') ||
                    action.toLowerCase().includes('increase')
        );
        break;
        
      case 'SALES_MANAGER':
        // Focus on sales performance and team metrics
        adaptedInsights.value_insights = enhancedInsights.value_insights.filter(
          insight => insight.toLowerCase().includes('sales') || 
                     insight.toLowerCase().includes('inventory') || 
                     insight.toLowerCase().includes('performance') ||
                     insight.toLowerCase().includes('product')
        );
        adaptedInsights.actionable_flags = enhancedInsights.actionable_flags.filter(
          action => action.toLowerCase().includes('sales') || 
                    action.toLowerCase().includes('training') ||
                    action.toLowerCase().includes('improve')
        );
        break;
        
      case 'MARKETING':
        // Focus on market trends and customer preferences
        adaptedInsights.value_insights = enhancedInsights.value_insights.filter(
          insight => insight.toLowerCase().includes('customer') || 
                     insight.toLowerCase().includes('trend') || 
                     insight.toLowerCase().includes('market') ||
                     insight.toLowerCase().includes('demand')
        );
        adaptedInsights.actionable_flags = enhancedInsights.actionable_flags.filter(
          action => action.toLowerCase().includes('market') || 
                    action.toLowerCase().includes('promot') ||
                    action.toLowerCase().includes('campaign')
        );
        break;
    }
    
    // Make sure we always include some insights even if filtering removed all
    if (adaptedInsights.value_insights.length === 0) {
      adaptedInsights.value_insights = enhancedInsights.value_insights.slice(0, 3);
    }
    
    if (adaptedInsights.actionable_flags.length === 0) {
      adaptedInsights.actionable_flags = enhancedInsights.actionable_flags.slice(0, 3);
    }
    
    // Add role-specific summary
    adaptedInsights.summary = `${enhancedInsights.summary} This report is tailored for ${role.replace('_', ' ')} stakeholders.`;
    
    return adaptedInsights;
  } catch (error) {
    console.error('Error generating role-specific insights:', error);
    return enhancedInsights;
  }
}