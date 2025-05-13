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
import { generateRoleSpecificInsights } from './enhancedInsightGenerator.js';
import { sendEmail } from './mailerService.js';

// Constants for delivery frequency
export const DELIVERY_FREQUENCY = {
  IMMEDIATE: 'IMMEDIATE',  // Send as soon as generated
  DAILY: 'DAILY',          // Send daily digest
  WEEKLY: 'WEEKLY',        // Send weekly digest
  MONTHLY: 'MONTHLY'       // Send monthly digest
};

// Distribution channels
export const DISTRIBUTION_CHANNEL = {
  EMAIL: 'EMAIL',           // Send via email
  DASHBOARD: 'DASHBOARD',   // Make available in dashboard
  API: 'API',               // Make available via API
  FILE: 'FILE'              // Save to file system
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
  // Validate role
  const validRoles = ['EXECUTIVE', 'SALES_MANAGER', 'MARKETING'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
  }
  
  // Validate channels
  const validChannels = Object.values(DISTRIBUTION_CHANNEL);
  channels.forEach(channel => {
    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}. Must be one of: ${validChannels.join(', ')}`);
    }
  });
  
  // Validate frequency
  const validFrequencies = Object.values(DELIVERY_FREQUENCY);
  if (!validFrequencies.includes(frequency)) {
    throw new Error(`Invalid frequency: ${frequency}. Must be one of: ${validFrequencies.join(', ')}`);
  }
  
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    email,
    role,
    name,
    platforms: platforms.length > 0 ? platforms : ['VinSolutions', 'VAUTO', 'DealerTrack'],
    channels: channels.length > 0 ? channels : [DISTRIBUTION_CHANNEL.EMAIL],
    frequency,
    createdAt: new Date().toISOString(),
    lastDelivery: null,
    status: 'active'
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
    // Check if this platform is in the stakeholder's platforms list
    const platform = enhancedInsights.metadata.platform;
    if (!distributionConfig.platforms.includes(platform)) {
      return {
        success: false,
        message: `Platform ${platform} not in stakeholder's platforms list`,
        distribution: null
      };
    }
    
    // Generate role-specific insights for this stakeholder
    const roleInsights = await generateRoleSpecificInsights(enhancedInsights, distributionConfig.role);
    
    // Distribution results for each channel
    const channelResults = [];
    
    // Distribute through each configured channel
    for (const channel of distributionConfig.channels) {
      let channelResult;
      
      switch (channel) {
        case DISTRIBUTION_CHANNEL.EMAIL:
          channelResult = await distributeViaEmail(roleInsights, distributionConfig);
          break;
          
        case DISTRIBUTION_CHANNEL.DASHBOARD:
          channelResult = await distributeViaDashboard(roleInsights, distributionConfig);
          break;
          
        case DISTRIBUTION_CHANNEL.API:
          channelResult = await distributeViaAPI(roleInsights, distributionConfig);
          break;
          
        case DISTRIBUTION_CHANNEL.FILE:
          channelResult = await distributeViaFile(roleInsights, distributionConfig);
          break;
          
        default:
          channelResult = {
            channel,
            success: false,
            message: `Unsupported distribution channel: ${channel}`
          };
      }
      
      channelResults.push(channelResult);
    }
    
    // Update last delivery timestamp
    distributionConfig.lastDelivery = new Date().toISOString();
    
    // Return combined results
    return {
      success: channelResults.some(result => result.success),
      message: channelResults.map(result => `${result.channel}: ${result.success ? 'Success' : 'Failed'} - ${result.message}`).join(', '),
      distribution: {
        stakeholder: {
          id: distributionConfig.id,
          email: distributionConfig.email,
          role: distributionConfig.role,
          name: distributionConfig.name
        },
        platform,
        channelResults,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error distributing insights:', error.message);
    return {
      success: false,
      message: `Failed to distribute insights: ${error.message}`,
      distribution: null
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
    // Generate email subject based on role and platform
    const subject = `${roleInsights.metadata.platform} Insights for ${config.role.toLowerCase().replace('_', ' ')}`;
    
    // Generate email content
    const emailContent = generateEmailContent(roleInsights, config);
    
    // Send the email
    const emailResult = await sendEmail({
      to: config.email,
      subject,
      html: emailContent.html,
      text: emailContent.text
    });
    
    return {
      channel: DISTRIBUTION_CHANNEL.EMAIL,
      success: emailResult.success,
      message: emailResult.message || 'Email sent successfully',
      emailId: emailResult.emailId
    };
  } catch (error) {
    console.error('Error distributing via email:', error.message);
    return {
      channel: DISTRIBUTION_CHANNEL.EMAIL,
      success: false,
      message: `Failed to send email: ${error.message}`
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
  // Generate plain text email
  const text = `
${config.name ? `Hello ${config.name},` : 'Hello,'}

Here are your ${roleInsights.metadata.platform} insights:

${roleInsights.adapted_insights.adapted_summary}

KEY POINTS:
${roleInsights.adapted_insights.key_points.map(point => `- ${point}`).join('\n')}

TOP ACTIONS:
${roleInsights.adapted_insights.action_items.slice(0, 3).map(item => `- ${item}`).join('\n')}

METRICS TO TRACK:
${roleInsights.adapted_insights.metrics_to_track.slice(0, 3).map(metric => `- ${metric}`).join('\n')}

BUSINESS IMPACT:
- Revenue potential: ${roleInsights.business_impact.revenue_impact.potential_gain}
- Implementation timeframe: ${roleInsights.business_impact.revenue_impact.timeframe}

This insight received a quality score of ${roleInsights.metadata.qualityScore}/100.

---
This is an automated insight from the Automotive Analytics Platform.
Generated: ${new Date(roleInsights.metadata.generatedAt).toLocaleString()}
  `;
  
  // Generate HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background-color: #f8f9fa; padding: 20px; border-bottom: 3px solid #0056b3; }
    .content { padding: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 16px; font-weight: bold; color: #0056b3; margin-bottom: 10px; text-transform: uppercase; }
    .footer { font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; margin-top: 30px; }
    .item { margin-bottom: 8px; }
    .impact { background-color: #f0f7ff; padding: 10px; border-left: 3px solid #0056b3; margin-bottom: 15px; }
    .score { display: inline-block; padding: 3px 8px; background-color: #28a745; color: white; border-radius: 12px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${roleInsights.metadata.platform} Insights</h2>
    <p>${config.name ? `For: ${config.name}` : ''} (${config.role.toLowerCase().replace('_', ' ')})</p>
  </div>
  
  <div class="content">
    <div class="section">
      <p style="font-size: 18px; font-weight: 500;">${roleInsights.adapted_insights.adapted_summary}</p>
    </div>
    
    <div class="section">
      <div class="section-title">Key Points</div>
      ${roleInsights.adapted_insights.key_points.map(point => `<div class="item">• ${point}</div>`).join('')}
    </div>
    
    <div class="section">
      <div class="section-title">Recommended Actions</div>
      ${roleInsights.adapted_insights.action_items.slice(0, 3).map(item => `<div class="item">• ${item}</div>`).join('')}
    </div>
    
    <div class="section">
      <div class="section-title">Metrics to Track</div>
      ${roleInsights.adapted_insights.metrics_to_track.slice(0, 3).map(metric => `<div class="item">• ${metric}</div>`).join('')}
    </div>
    
    <div class="impact">
      <div class="section-title">Business Impact</div>
      <div class="item"><strong>Revenue Potential:</strong> ${roleInsights.business_impact.revenue_impact.potential_gain}</div>
      <div class="item"><strong>Implementation Timeframe:</strong> ${roleInsights.business_impact.revenue_impact.timeframe}</div>
      <div class="item"><strong>Implementation Complexity:</strong> ${roleInsights.business_impact.revenue_impact.implementation_complexity}</div>
    </div>
    
    <div>
      <p>Insight Quality: <span class="score">${roleInsights.metadata.qualityScore}/100</span></p>
    </div>
    
    <div class="footer">
      <p>This is an automated insight from the Automotive Analytics Platform.</p>
      <p>Generated: ${new Date(roleInsights.metadata.generatedAt).toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return { text, html };
}

/**
 * Distribute insights via dashboard
 * 
 * @param {Object} roleInsights - Role-specific insights
 * @param {Object} config - Distribution configuration
 * @returns {Promise<Object>} Dashboard distribution result
 */
async function distributeViaDashboard(roleInsights, config) {
  try {
    // In a real implementation, this would store the insights in a database
    // for access via a web dashboard. For now, we'll simulate success.
    return {
      channel: DISTRIBUTION_CHANNEL.DASHBOARD,
      success: true,
      message: 'Insights added to dashboard',
      dashboardId: `dashboard-${Date.now()}`
    };
  } catch (error) {
    console.error('Error distributing via dashboard:', error.message);
    return {
      channel: DISTRIBUTION_CHANNEL.DASHBOARD,
      success: false,
      message: `Failed to add to dashboard: ${error.message}`
    };
  }
}

/**
 * Distribute insights via API
 * 
 * @param {Object} roleInsights - Role-specific insights
 * @param {Object} config - Distribution configuration
 * @returns {Promise<Object>} API distribution result
 */
async function distributeViaAPI(roleInsights, config) {
  try {
    // In a real implementation, this would make the insights available
    // via an API endpoint. For now, we'll simulate success.
    return {
      channel: DISTRIBUTION_CHANNEL.API,
      success: true,
      message: 'Insights available via API',
      apiPath: `/api/insights/${roleInsights.metadata.platform}/${config.id}`
    };
  } catch (error) {
    console.error('Error distributing via API:', error.message);
    return {
      channel: DISTRIBUTION_CHANNEL.API,
      success: false,
      message: `Failed to make available via API: ${error.message}`
    };
  }
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
    // Save to a role-specific file in the results directory
    const platform = roleInsights.metadata.platform;
    const dateStr = new Date().toISOString().split('T')[0];
    const resultsDir = path.join(process.cwd(), 'results', platform, dateStr, 'distributions');
    
    // Create directory if it doesn't exist
    await fs.mkdir(resultsDir, { recursive: true });
    
    const filename = `${config.role.toLowerCase()}-${config.id}-${Date.now()}.json`;
    const filePath = path.join(resultsDir, filename);
    
    await fs.writeFile(filePath, JSON.stringify({
      role: config.role,
      recipient: {
        id: config.id,
        email: config.email,
        name: config.name
      },
      insights: roleInsights,
      timestamp: new Date().toISOString()
    }, null, 2), 'utf-8');
    
    return {
      channel: DISTRIBUTION_CHANNEL.FILE,
      success: true,
      message: `Insights saved to file: ${filename}`,
      filePath
    };
  } catch (error) {
    console.error('Error distributing via file:', error.message);
    return {
      channel: DISTRIBUTION_CHANNEL.FILE,
      success: false,
      message: `Failed to save to file: ${error.message}`
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
  try {
    const results = [];
    
    // Process each stakeholder configuration
    for (const config of distributionConfigs) {
      // Check if this stakeholder should receive insights based on frequency
      if (shouldDistributeByFrequency(config)) {
        const result = await distributeInsights(enhancedInsights, config);
        results.push(result);
      } else {
        results.push({
          success: true,
          message: `Skipped based on frequency setting: ${config.frequency}`,
          distribution: {
            stakeholder: {
              id: config.id,
              email: config.email,
              role: config.role
            },
            platform: enhancedInsights.metadata.platform,
            skipped: true,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    return {
      success: results.some(result => result.success),
      message: `Scheduled distribution completed: ${results.filter(r => r.success).length}/${results.length} successful`,
      results
    };
  } catch (error) {
    console.error('Error scheduling distribution:', error.message);
    return {
      success: false,
      message: `Failed to schedule distribution: ${error.message}`,
      results: []
    };
  }
}

/**
 * Determine if insights should be distributed based on frequency setting
 * 
 * @param {Object} config - Distribution configuration
 * @returns {boolean} True if insights should be distributed
 */
function shouldDistributeByFrequency(config) {
  // Always distribute for immediate frequency
  if (config.frequency === DELIVERY_FREQUENCY.IMMEDIATE) {
    return true;
  }
  
  // Always distribute if there's no previous delivery
  if (!config.lastDelivery) {
    return true;
  }
  
  const now = new Date();
  const lastDelivery = new Date(config.lastDelivery);
  const daysSinceLastDelivery = Math.floor((now - lastDelivery) / (1000 * 60 * 60 * 24));
  
  switch (config.frequency) {
    case DELIVERY_FREQUENCY.DAILY:
      return daysSinceLastDelivery >= 1;
      
    case DELIVERY_FREQUENCY.WEEKLY:
      return daysSinceLastDelivery >= 7;
      
    case DELIVERY_FREQUENCY.MONTHLY:
      // Simple approximation - more accurate would check the actual month
      return daysSinceLastDelivery >= 30;
      
    default:
      return false;
  }
}