/**
 * Insight Distribution Service
 * 
 * Handles the scheduled distribution of insights to different stakeholders
 * with role-based personalization and tracking.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

// Distribution roles with default recipients
const defaultRoleConfig = {
  inventory: {
    emails: ['inventory-manager@dealership.com'],
    insightTypes: ['inventory_health', 'pricing_strategy', 'market_comparison']
  },
  sales: {
    emails: ['sales-manager@dealership.com', 'team-leads@dealership.com'],
    insightTypes: ['lead_performance', 'conversion_metrics', 'sales_trends']
  },
  finance: {
    emails: ['finance-director@dealership.com'],
    insightTypes: ['finance_performance', 'product_penetration', 'profitability']
  },
  executive: {
    emails: ['gm@dealership.com', 'owner@dealership.com'],
    insightTypes: ['summary', 'strategic_recommendations', 'market_position']
  }
};

/**
 * Distribute insights based on role-based rules
 * 
 * @param {string} insightId - ID of insight to distribute
 * @param {Object} options - Distribution options
 * @returns {Promise<Object>} - Results of distribution
 */
export async function distributeInsights(insightId, options = {}) {
  try {
    console.log(`Distributing insights: ${insightId}`);
    
    // Default options
    const config = {
      specificRoles: options.specificRoles || [],
      sendEmails: options.sendEmails !== false,
      source: options.source || 'manual',
      userId: options.userId || 'system'
    };
    
    // Load insight data
    const insightData = await loadInsightData(insightId);
    
    if (!insightData) {
      return {
        success: false,
        message: `Insight not found: ${insightId}`,
        distributionsCreated: 0
      };
    }
    
    const vendor = insightData.metadata?.platform || 'Unknown';
    
    // Determine which roles should receive this insight
    const targetRoles = determineTargetRoles(insightData, vendor, {
      specificRoles: config.specificRoles
    });
    
    console.log(`Distributing to roles: ${targetRoles.join(', ')}`);
    
    // Keep track of distributions
    const distributions = [];
    
    // For each role, send personalized content to recipients
    for (const role of targetRoles) {
      // Get recipients for this role
      const recipients = getRoleRecipients(role);
      
      if (!recipients || recipients.length === 0) {
        console.log(`No recipients configured for role: ${role}`);
        continue;
      }
      
      console.log(`Role ${role}: ${recipients.length} recipient(s)`);
      
      // Create personalized email for each recipient
      for (const recipientEmail of recipients) {
        // Generate a unique distribution ID
        const distributionId = uuidv4();
        
        // Record the distribution
        distributions.push({
          id: distributionId,
          insightId,
          role,
          recipientEmail,
          timestamp: new Date().toISOString(),
          source: config.source
        });
        
        // Send the email if enabled
        if (config.sendEmails) {
          await sendInsightEmail(
            distributionId,
            recipientEmail,
            role,
            insightData,
            vendor,
            config.source
          );
        } else {
          console.log(`Would send email to ${recipientEmail} (disabled)`);
        }
      }
    }
    
    // Save distribution records
    await saveDistributionRecords(distributions);
    
    return {
      success: true,
      message: `Distributed insights to ${distributions.length} recipients`,
      distributionsCreated: distributions.length,
      distributions
    };
  } catch (error) {
    console.error('Error distributing insights:', error);
    return {
      success: false,
      message: error.message,
      distributionsCreated: 0
    };
  }
}

/**
 * Determine which roles should receive this insight
 */
function determineTargetRoles(insightData, vendor, options = {}) {
  // If specific roles are provided, use those
  if (options.specificRoles && options.specificRoles.length > 0) {
    return options.specificRoles;
  }
  
  const targetRoles = new Set();
  
  // Always include executive for high impact insights
  if (insightData.businessImpact && 
      ['transformative', 'significant'].includes(insightData.businessImpact.overallImpact?.impactLevel)) {
    targetRoles.add('executive');
  }
  
  // Check KPIs and opportunities for role-specific content
  const allText = JSON.stringify(insightData);
  
  // Check for inventory focus
  if (allText.includes('inventory') || allText.includes('days on lot') || 
      allText.includes('turn') || allText.includes('stock')) {
    targetRoles.add('inventory');
  }
  
  // Check for sales focus
  if (allText.includes('sales') || allText.includes('lead') || 
      allText.includes('conversion') || allText.includes('traffic')) {
    targetRoles.add('sales');
  }
  
  // Check for finance focus
  if (allText.includes('finance') || allText.includes('F&I') || 
      allText.includes('profit') || allText.includes('revenue')) {
    targetRoles.add('finance');
  }
  
  // Add role based on vendor
  switch (vendor) {
    case 'VinSolutions':
      // CRM system - sales teams are primary audience
      targetRoles.add('sales');
      break;
    case 'VAUTO':
      // Inventory system - inventory teams are primary audience
      targetRoles.add('inventory');
      break;
    case 'DealerTrack':
      // F&I system - finance teams are primary audience
      targetRoles.add('finance');
      break;
  }
  
  // Always include executive summary for comprehensive insights
  if (targetRoles.size >= 2) {
    targetRoles.add('executive');
  }
  
  return Array.from(targetRoles);
}

/**
 * Send personalized insight email to a recipient
 */
async function sendInsightEmail(distributionId, recipientEmail, recipientRole, insightData, vendor, source) {
  try {
    console.log(`Sending insight email to ${recipientEmail} (${recipientRole})`);
    
    // Generate personalized email content
    const emailContent = generatePersonalizedEmail(
      recipientEmail,
      recipientRole,
      insightData,
      vendor,
      source
    );
    
    // Configure Nodemailer transporter
    // In production, you would use SendGrid or a real SMTP server
    const testAccount = await nodemailer.createTestAccount();
    
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    // Send email
    const info = await transporter.sendMail({
      from: '"Dealership Insights" <insights@dealership.com>',
      to: recipientEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      headers: {
        'X-Distribution-ID': distributionId,
        'X-Insight-ID': insightData.metadata?.insightId || 'unknown'
      }
    });
    
    console.log(`Email sent: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error(`Error sending email to ${recipientEmail}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate personalized email content based on recipient role
 */
function generatePersonalizedEmail(recipientEmail, recipientRole, insightData, vendor, source) {
  // Get role-specific insights
  let insights;
  let roleTitle;
  let rolePriorities;
  
  switch (recipientRole) {
    case 'inventory':
      insights = extractInventoryInsights(insightData);
      roleTitle = "Inventory Manager";
      rolePriorities = ["inventory health", "pricing strategy", "aged inventory"];
      break;
    case 'sales':
      insights = extractSalesInsights(insightData);
      roleTitle = "Sales Manager";
      rolePriorities = ["lead conversion", "sales performance", "customer engagement"];
      break;
    case 'finance':
      insights = extractFinanceInsights(insightData);
      roleTitle = "Finance Director";
      rolePriorities = ["profitability", "product penetration", "F&I performance"];
      break;
    case 'executive':
      insights = extractExecutiveInsights(insightData);
      roleTitle = "Dealership Executive";
      rolePriorities = ["strategic insights", "overall performance", "competitive position"];
      break;
    default:
      insights = extractGeneralInsights(insightData);
      roleTitle = "Dealership Team Member";
      rolePriorities = ["dealership performance", "key indicators"];
  }
  
  // Prioritize insights
  const prioritizedInsights = prioritizeInsights(insights);
  
  // Generate email content
  const date = formatDate(new Date());
  const title = `${vendor} Insights Report (${date})`;
  const subject = `${title}: ${insightData.summary || 'Dealership Insights'}`;
  
  // Generate plain text content
  const text = `
${title}
${'-'.repeat(title.length)}

Dear ${roleTitle},

Here are your personalized insights for ${date}:

SUMMARY:
${insightData.summary || 'No summary available.'}

KEY POINTS:
${prioritizedInsights.map(insight => `- ${insight.title}: ${insight.description}`).join('\n')}

${prioritizedInsights.length > 0 ? '\nKEY OPPORTUNITIES:' : ''}
${prioritizedInsights.map((insight, i) => 
  insight.actionSteps ? 
  `${i+1}. ${insight.title}:\n   ${insight.actionSteps.map(step => `• ${step}`).join('\n   ')}` : 
  ''
).filter(Boolean).join('\n\n')}

This report was generated based on data from ${vendor} on ${date}.
For more details, please log in to the Insights Dashboard.

Regards,
Dealership Insights Team
`;

  // Generate HTML content
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; }
    .header { background-color: #00457c; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 18px; color: #00457c; margin-bottom: 10px; font-weight: bold; }
    .opportunity { margin-bottom: 15px; border-left: 4px solid #00457c; padding-left: 15px; }
    .opportunity-title { font-weight: bold; margin-bottom: 5px; }
    .action-steps { margin-top: 10px; }
    .action-step { margin-bottom: 5px; }
    .footer { padding: 15px; background-color: #f5f5f5; text-align: center; font-size: 12px; color: #666; }
    .priority-high { border-left-color: #d9534f; }
    .priority-medium { border-left-color: #f0ad4e; }
    .priority-low { border-left-color: #5bc0de; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Personalized for: ${roleTitle}</p>
  </div>
  
  <div class="content">
    <div class="section">
      <p><strong>Dear ${roleTitle},</strong></p>
      <p>Here are your personalized insights based on recent ${vendor} data:</p>
    </div>
    
    <div class="section">
      <div class="section-title">Summary</div>
      <p>${insightData.summary || 'No summary available.'}</p>
    </div>
    
    ${prioritizedInsights.length > 0 ? `
    <div class="section">
      <div class="section-title">Key Opportunities</div>
      ${prioritizedInsights.map(insight => `
        <div class="opportunity ${insight.priority ? `priority-${insight.priority.toLowerCase()}` : ''}">
          <div class="opportunity-title">${insight.title}</div>
          <div>${insight.description}</div>
          ${insight.actionSteps ? `
            <div class="action-steps">
              <strong>Action Steps:</strong>
              <ul>
                ${insight.actionSteps.map(step => `<li class="action-step">${step}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">Next Steps</div>
      <p>For more detailed insights and interactive dashboards, please log in to the Insights Portal.</p>
    </div>
  </div>
  
  <div class="footer">
    <p>This report was generated based on data from ${vendor} on ${date}.</p>
    <p>Distribution ID: ${uuidv4()}</p>
  </div>
</body>
</html>
`;

  return {
    subject,
    text,
    html,
    role: recipientRole,
    recipient: recipientEmail,
    priorities: rolePriorities
  };
}

/**
 * Extract inventory-focused insights
 */
function extractInventoryInsights(insightData) {
  const insights = [];
  
  // Process all opportunities
  if (insightData.opportunities && Array.isArray(insightData.opportunities)) {
    for (const opportunity of insightData.opportunities) {
      // Check if this opportunity is inventory-focused
      if (
        opportunity.title.toLowerCase().includes('inventory') ||
        opportunity.title.toLowerCase().includes('stock') ||
        opportunity.title.toLowerCase().includes('vehicle') ||
        opportunity.title.toLowerCase().includes('pricing') ||
        (opportunity.owner && opportunity.owner.toLowerCase().includes('inventory'))
      ) {
        insights.push(opportunity);
      }
    }
  }
  
  // Add KPIs related to inventory
  if (insightData.keyPerformanceIndicators) {
    for (const [key, value] of Object.entries(insightData.keyPerformanceIndicators)) {
      if (
        key.toLowerCase().includes('inventory') ||
        key.toLowerCase().includes('turn') ||
        key.toLowerCase().includes('age') ||
        key.toLowerCase().includes('day') ||
        key.toLowerCase().includes('stock')
      ) {
        insights.push({
          title: `KPI: ${key}`,
          description: JSON.stringify(value),
          priority: 'Medium'
        });
      }
    }
  }
  
  return insights;
}

/**
 * Extract sales-focused insights
 */
function extractSalesInsights(insightData) {
  const insights = [];
  
  // Process all opportunities
  if (insightData.opportunities && Array.isArray(insightData.opportunities)) {
    for (const opportunity of insightData.opportunities) {
      // Check if this opportunity is sales-focused
      if (
        opportunity.title.toLowerCase().includes('sales') ||
        opportunity.title.toLowerCase().includes('lead') ||
        opportunity.title.toLowerCase().includes('conversion') ||
        opportunity.title.toLowerCase().includes('customer') ||
        (opportunity.owner && opportunity.owner.toLowerCase().includes('sales'))
      ) {
        insights.push(opportunity);
      }
    }
  }
  
  // Add KPIs related to sales
  if (insightData.keyPerformanceIndicators) {
    for (const [key, value] of Object.entries(insightData.keyPerformanceIndicators)) {
      if (
        key.toLowerCase().includes('sales') ||
        key.toLowerCase().includes('lead') ||
        key.toLowerCase().includes('conversion') ||
        key.toLowerCase().includes('traffic')
      ) {
        insights.push({
          title: `KPI: ${key}`,
          description: JSON.stringify(value),
          priority: 'Medium'
        });
      }
    }
  }
  
  return insights;
}

/**
 * Extract finance-focused insights
 */
function extractFinanceInsights(insightData) {
  const insights = [];
  
  // Process all opportunities
  if (insightData.opportunities && Array.isArray(insightData.opportunities)) {
    for (const opportunity of insightData.opportunities) {
      // Check if this opportunity is finance-focused
      if (
        opportunity.title.toLowerCase().includes('finance') ||
        opportunity.title.toLowerCase().includes('f&i') ||
        opportunity.title.toLowerCase().includes('profit') ||
        opportunity.title.toLowerCase().includes('revenue') ||
        opportunity.title.toLowerCase().includes('penetration') ||
        (opportunity.owner && opportunity.owner.toLowerCase().includes('finance'))
      ) {
        insights.push(opportunity);
      }
    }
  }
  
  // Add KPIs related to finance
  if (insightData.keyPerformanceIndicators) {
    for (const [key, value] of Object.entries(insightData.keyPerformanceIndicators)) {
      if (
        key.toLowerCase().includes('finance') ||
        key.toLowerCase().includes('f&i') ||
        key.toLowerCase().includes('profit') ||
        key.toLowerCase().includes('revenue') ||
        key.toLowerCase().includes('product')
      ) {
        insights.push({
          title: `KPI: ${key}`,
          description: JSON.stringify(value),
          priority: 'Medium'
        });
      }
    }
  }
  
  return insights;
}

/**
 * Extract executive-focused insights
 */
function extractExecutiveInsights(insightData) {
  const insights = [];
  
  // Add strategic recommendations
  if (insightData.strategicRecommendations && Array.isArray(insightData.strategicRecommendations)) {
    for (let i = 0; i < insightData.strategicRecommendations.length; i++) {
      const recommendation = insightData.strategicRecommendations[i];
      insights.push({
        title: `Strategic Recommendation ${i+1}`,
        description: recommendation,
        priority: 'High'
      });
    }
  }
  
  // Add high-impact opportunities
  if (insightData.opportunities && Array.isArray(insightData.opportunities)) {
    for (const opportunity of insightData.opportunities) {
      if (opportunity.priority && opportunity.priority.toLowerCase() === 'high') {
        insights.push(opportunity);
      }
    }
  }
  
  // Add summary insight
  if (insightData.summary) {
    insights.push({
      title: 'Performance Summary',
      description: insightData.summary,
      priority: 'High'
    });
  }
  
  // Add business impact if available
  if (insightData.businessImpact && insightData.businessImpact.overallImpact) {
    insights.push({
      title: 'Business Impact Overview',
      description: `Overall impact: ${insightData.businessImpact.overallImpact.impactLevel} (${insightData.businessImpact.overallImpact.score}/10)`,
      priority: 'High'
    });
  }
  
  return insights;
}

/**
 * Extract general insights for default role
 */
function extractGeneralInsights(insightData) {
  const insights = [];
  
  // Add summary
  if (insightData.summary) {
    insights.push({
      title: 'Summary',
      description: insightData.summary,
      priority: 'Medium'
    });
  }
  
  // Add some opportunities
  if (insightData.opportunities && Array.isArray(insightData.opportunities)) {
    // Just take the first few opportunities
    for (let i = 0; i < Math.min(3, insightData.opportunities.length); i++) {
      insights.push(insightData.opportunities[i]);
    }
  }
  
  return insights;
}

/**
 * Prioritize insights based on priority field
 */
function prioritizeInsights(insights) {
  if (!insights || !Array.isArray(insights)) {
    return [];
  }
  
  // Helper function to get priority value
  function getPriorityValue(priority) {
    if (!priority) return 2; // Default to medium
    switch(priority.toLowerCase()) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }
  
  // Sort insights by priority
  return [...insights].sort((a, b) => {
    return getPriorityValue(a.priority) - getPriorityValue(b.priority);
  });
}

/**
 * Format date for display
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Get recipients for a specific role
 */
function getRoleRecipients(role) {
  // In a real implementation, this would fetch from database
  // Return default role config for demonstration
  return defaultRoleConfig[role]?.emails || [];
}

/**
 * Load insight data from file or database
 */
async function loadInsightData(insightId) {
  try {
    // In a real implementation, this would load from database
    // For demonstration, we'll try to find the file in results directory
    
    // Check if this is a file path
    if (insightId.includes('/') && fs.existsSync(insightId)) {
      const fileContent = fs.readFileSync(insightId, 'utf8');
      return JSON.parse(fileContent);
    }
    
    // Try to find the insight in the results directory
    const resultsDir = path.join(process.cwd(), 'results');
    
    if (!fs.existsSync(resultsDir)) {
      console.log('Results directory not found');
      return null;
    }
    
    // Search for insights in subdirectories
    let foundInsight = null;
    
    // This is a simplified search without recursion for demonstration
    // In a real implementation, you'd use a database query
    const vendors = fs.readdirSync(resultsDir);
    
    for (const vendor of vendors) {
      const vendorPath = path.join(resultsDir, vendor);
      
      if (fs.statSync(vendorPath).isDirectory()) {
        const dates = fs.readdirSync(vendorPath);
        
        for (const date of dates) {
          const datePath = path.join(vendorPath, date);
          
          if (fs.statSync(datePath).isDirectory()) {
            const files = fs.readdirSync(datePath);
            
            for (const file of files) {
              if (file.endsWith('.json')) {
                const filePath = path.join(datePath, file);
                
                try {
                  const content = fs.readFileSync(filePath, 'utf8');
                  const insightData = JSON.parse(content);
                  
                  // Check if this is the insight we're looking for
                  if (insightData.metadata && insightData.metadata.insightId === insightId) {
                    foundInsight = insightData;
                    break;
                  }
                } catch (error) {
                  console.error(`Error reading insight file ${filePath}:`, error);
                }
              }
            }
            
            if (foundInsight) break;
          }
        }
        
        if (foundInsight) break;
      }
    }
    
    return foundInsight;
  } catch (error) {
    console.error(`Error loading insight data ${insightId}:`, error);
    return null;
  }
}

/**
 * Save distribution records
 */
async function saveDistributionRecords(distributions) {
  try {
    // In a real implementation, this would save to database
    // For demonstration, we'll save to a JSON file
    
    // Create a logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const distributionsDir = path.join(logsDir, 'distributions');
    if (!fs.existsSync(distributionsDir)) {
      fs.mkdirSync(distributionsDir, { recursive: true });
    }
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = `distributions_${timestamp}.json`;
    const filePath = path.join(distributionsDir, fileName);
    
    // Write distributions to file
    fs.writeFileSync(filePath, JSON.stringify(distributions, null, 2));
    
    console.log(`Distribution records saved to ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('Error saving distribution records:', error);
    return null;
  }
}

/**
 * Process scheduled distributions based on configured schedules
 */
export async function processScheduledDistributions() {
  try {
    console.log('Processing scheduled distributions...');
    
    // In a real implementation, this would check the schedule configuration
    // and distribute the latest insights based on the schedule
    
    // For demonstration, we'll simulate a daily distribution
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    console.log(`Scheduled distribution run: ${timestamp}`);
    
    // Get the latest insight for each vendor
    const vendors = ['VinSolutions', 'VAUTO', 'DealerTrack'];
    const results = [];
    
    for (const vendor of vendors) {
      try {
        const latestInsight = await getLatestInsightForVendor(vendor);
        
        if (latestInsight) {
          console.log(`Found latest insight for ${vendor}: ${latestInsight.metadata?.insightId}`);
          
          // Check if this insight has already been distributed today
          const alreadyDistributed = await checkDistributionStatus(
            latestInsight.metadata?.insightId,
            Object.keys(defaultRoleConfig)
          );
          
          if (alreadyDistributed) {
            console.log(`Skipping distribution for ${vendor} - already distributed today`);
            results.push({
              vendor,
              insightId: latestInsight.metadata?.insightId,
              status: 'skipped',
              reason: 'already_distributed'
            });
            continue;
          }
          
          // Distribute the insight
          const distributionResult = await distributeInsights(
            latestInsight.metadata?.insightId,
            {
              source: 'scheduled',
              sendEmails: true
            }
          );
          
          results.push({
            vendor,
            insightId: latestInsight.metadata?.insightId,
            status: distributionResult.success ? 'distributed' : 'failed',
            distributionsCreated: distributionResult.distributionsCreated,
            error: distributionResult.success ? null : distributionResult.message
          });
        } else {
          console.log(`No insights found for ${vendor}`);
          results.push({
            vendor,
            status: 'skipped',
            reason: 'no_insights'
          });
        }
      } catch (error) {
        console.error(`Error processing distribution for ${vendor}:`, error);
        results.push({
          vendor,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return {
      timestamp,
      results
    };
  } catch (error) {
    console.error('Error processing scheduled distributions:', error);
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      results: []
    };
  }
}

/**
 * Get the latest insight for a vendor
 */
async function getLatestInsightForVendor(vendor) {
  try {
    const resultsDir = path.join(process.cwd(), 'results');
    const vendorDir = path.join(resultsDir, vendor);
    
    if (!fs.existsSync(vendorDir)) {
      console.log(`No directory found for vendor: ${vendor}`);
      return null;
    }
    
    // Get all date directories
    const dateDirs = fs.readdirSync(vendorDir)
      .filter(name => !name.includes('.')) // Skip files
      .sort()
      .reverse(); // Sort in descending order to get the latest first
    
    if (dateDirs.length === 0) {
      console.log(`No date directories found for vendor: ${vendor}`);
      return null;
    }
    
    // Look through the most recent dates first
    for (const dateDir of dateDirs) {
      const datePath = path.join(vendorDir, dateDir);
      
      if (fs.statSync(datePath).isDirectory()) {
        // Get all insight files
        const files = fs.readdirSync(datePath)
          .filter(name => name.endsWith('.json') && name.includes('insights_'))
          .sort()
          .reverse(); // Sort in descending order to get the latest first
        
        if (files.length > 0) {
          // Load the most recent insight file
          const latestInsightPath = path.join(datePath, files[0]);
          const content = fs.readFileSync(latestInsightPath, 'utf8');
          return JSON.parse(content);
        }
      }
    }
    
    console.log(`No insight files found for vendor: ${vendor}`);
    return null;
  } catch (error) {
    console.error(`Error getting latest insight for ${vendor}:`, error);
    return null;
  }
}

/**
 * Check if an insight has already been distributed to specific roles today
 */
async function checkDistributionStatus(insightId, roles) {
  try {
    // In a real implementation, this would check the database
    // For demonstration, we'll always return false (not distributed)
    return false;
  } catch (error) {
    console.error(`Error checking distribution status for ${insightId}:`, error);
    return false;
  }
}

// Export functions
export default {
  distributeInsights,
  processScheduledDistributions
};