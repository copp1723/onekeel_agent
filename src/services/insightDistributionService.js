/**
 * Insight Distribution Service
 * Delivers insights to stakeholders based on roles and channels
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';

// Initialize the SendGrid client if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Define distribution channels
const DISTRIBUTION_CHANNELS = {
  EMAIL: 'email',
  SLACK: 'slack',
  FILE: 'file',
  API: 'api'
};

// Define stakeholder roles and their information focus
const STAKEHOLDER_ROLES = {
  EXECUTIVE: {
    name: 'Executive',
    focusAreas: ['profitability', 'revenue', 'trends', 'forecasting'],
    metrics: ['total_revenue', 'gross_profit', 'average_profit', 'market_share'],
    insightCategories: ['high_impact', 'strategic', 'risk']
  },
  SALES_MANAGER: {
    name: 'Sales Manager',
    focusAreas: ['sales performance', 'inventory', 'staff performance', 'deals'],
    metrics: ['conversion_rate', 'sales_by_rep', 'deal_types', 'days_in_inventory'],
    insightCategories: ['operational', 'tactical', 'opportunity']
  },
  MARKETING: {
    name: 'Marketing',
    focusAreas: ['demand trends', 'customer preferences', 'model performance', 'advertising'],
    metrics: ['top_models', 'search_trends', 'lead_sources', 'customer_demographics'],
    insightCategories: ['awareness', 'market_trends', 'customer_behavior']
  },
  FINANCE: {
    name: 'Finance',
    focusAreas: ['profitability', 'cost structure', 'financing', 'cash flow'],
    metrics: ['finance_product_attachment', 'average_transaction_value', 'cost_metrics'],
    insightCategories: ['financial', 'risk', 'opportunity']
  },
  SERVICE: {
    name: 'Service',
    focusAreas: ['service revenue', 'customer satisfaction', 'parts inventory', 'technician performance'],
    metrics: ['service_revenue', 'customer_retention', 'parts_inventory_turnover'],
    insightCategories: ['operational', 'customer_experience']
  },
  GENERAL_MANAGER: {
    name: 'General Manager',
    focusAreas: ['overall performance', 'department performance', 'strategic direction'],
    metrics: ['all'],
    insightCategories: ['all']
  }
};

/**
 * Distribute insights to stakeholders
 * @param {Object} insights - Generated insights
 * @param {string} platform - CRM platform name
 * @param {Object} options - Distribution options
 * @returns {Promise<Object>} Distribution results
 */
export async function distributeInsights(insights, platform, options = {}) {
  try {
    console.log(`Distributing insights for ${platform}...`);
    
    // Get distribution configurations
    const distributionConfigs = await getDistributionConfigs(platform);
    console.log(`Created ${distributionConfigs.length} distribution configurations`);
    
    // Results tracking
    const results = {
      success: true,
      distributions: [],
      errors: []
    };
    
    // Distribute based on configurations
    for (const config of distributionConfigs) {
      try {
        console.log(`Distributing to ${config.role} (${config.recipient.name})...`);
        
        // Generate role-specific insights
        let roleSpecificInsights;
        try {
          console.log(`Generating role-specific insights for ${config.role}...`);
          roleSpecificInsights = generateRoleSpecificInsights(insights, config.role);
        } catch (insightError) {
          console.error(`Error generating role-specific insights:`, insightError);
          roleSpecificInsights = { ...insights };
        }
        
        // Track distribution
        const distributionResult = {
          role: config.role,
          recipient: config.recipient.name,
          channels: {}
        };
        
        // Distribute via each configured channel
        for (const channel of config.channels) {
          try {
            console.log(`Distributing insights via ${channel} to ${config.role} (${config.recipient.name})`);
            
            switch (channel) {
              case DISTRIBUTION_CHANNELS.EMAIL:
                const emailResult = await distributeViaEmail(
                  roleSpecificInsights,
                  config.recipient.email,
                  config.role,
                  platform
                );
                distributionResult.channels.EMAIL = emailResult ? 'Success' : 'Failed';
                break;
                
              case DISTRIBUTION_CHANNELS.SLACK:
                // Not implemented yet
                distributionResult.channels.SLACK = 'Not implemented';
                break;
                
              case DISTRIBUTION_CHANNELS.FILE:
                const fileResult = await distributeViaFile(
                  roleSpecificInsights,
                  config.role.toLowerCase(),
                  platform
                );
                distributionResult.channels.FILE = fileResult ? 'Success' : 'Failed';
                break;
                
              case DISTRIBUTION_CHANNELS.API:
                // Not implemented yet
                distributionResult.channels.API = 'Not implemented';
                break;
                
              default:
                distributionResult.channels[channel] = 'Unknown channel';
            }
          } catch (channelError) {
            console.error(`Error distributing via ${channel}:`, channelError);
            distributionResult.channels[channel] = `Failed - ${channelError.message}`;
            results.errors.push({
              role: config.role,
              channel,
              error: channelError.message
            });
          }
        }
        
        // Track successful distribution
        const isSuccess = Object.values(distributionResult.channels).some(
          status => status === 'Success'
        );
        
        // Print success/fail message
        if (isSuccess) {
          console.log(`✓ Successfully distributed insights to ${config.role}`);
          
          // Log channel statuses
          for (const [channel, status] of Object.entries(distributionResult.channels)) {
            const statusIcon = status === 'Success' ? '✓' : '✗';
            let statusMessage = status;
            
            if (status.startsWith('Failed')) {
              statusMessage = `Failed - ${status.substring(8)}`;
              console.log(`  - ${channel}: ${statusIcon} ${statusMessage}`);
            } else {
              console.log(`  - ${channel}: ${statusIcon} ${status}`);
            }
          }
        } else {
          console.error(`✗ Failed to distribute insights to ${config.role}`);
        }
        
        results.distributions.push(distributionResult);
      } catch (configError) {
        console.error(`Error processing distribution config for ${config.role}:`, configError);
        results.errors.push({
          role: config.role,
          error: configError.message
        });
      }
    }
    
    // Set overall success based on errors
    if (results.errors.length > 0) {
      results.success = false;
    }
    
    return results;
  } catch (error) {
    console.error('Error distributing insights:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Distribute insights via email
 * @param {Object} insights - Insights to distribute
 * @param {string} recipient - Recipient email address
 * @param {string} role - Recipient role
 * @param {string} platform - CRM platform name
 * @returns {Promise<boolean>} Success status
 */
async function distributeViaEmail(insights, recipient, role, platform) {
  try {
    if (!recipient) {
      throw new Error('Recipient email is required');
    }
    
    // Generate email content
    const { subject, text, html } = generateEmailContent(insights, role, platform);
    
    // Initialize email transport
    const transporter = await getEmailTransport();
    
    // Attempt to send with SendGrid first
    if (process.env.SENDGRID_API_KEY) {
      try {
        await sgMail.send({
          to: recipient,
          from: process.env.FROM_EMAIL || 'insights@agentflow.ai',
          subject,
          text,
          html
        });
        console.log(`Email sent to ${recipient} via SendGrid`);
        return true;
      } catch (sgError) {
        console.error('SendGrid error:', sgError);
        // Fall back to Nodemailer
      }
    }
    
    // Send via Nodemailer if SendGrid fails or is not configured
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'insights@agentflow.ai',
      to: recipient,
      subject,
      text,
      html
    });
    
    console.log(`Email sent to ${recipient} via Nodemailer`);
    
    // Log preview URL if using ethereal
    if (info.ethereal) {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error distributing via email:`, error);
    throw error;
  }
}

/**
 * Generate email content based on insights and role
 * @param {Object} insights - The insights to include
 * @param {string} role - Recipient role
 * @param {string} platform - CRM platform name
 * @returns {Object} Email content (subject, text, html)
 */
function generateEmailContent(insights, role, platform) {
  const roleDef = STAKEHOLDER_ROLES[role] || STAKEHOLDER_ROLES.GENERAL_MANAGER;
  const roleTitle = roleDef.name;
  
  // Generate subject
  const subject = `${platform} Insights for ${roleTitle} - ${new Date().toLocaleDateString()}`;
  
  // Generate text version
  let text = `${platform} Insights for ${roleTitle}\n`;
  text += `Generated on: ${new Date().toLocaleString()}\n\n`;
  
  text += `KEY INSIGHTS:\n`;
  if (insights.insights && insights.insights.length > 0) {
    insights.insights.forEach((insight, index) => {
      text += `${index + 1}. ${insight}\n`;
    });
  }
  
  text += `\nKEY METRICS:\n`;
  if (insights.key_metrics) {
    Object.entries(insights.key_metrics).forEach(([key, value]) => {
      text += `${key.replace(/_/g, ' ')}: ${value}\n`;
    });
  }
  
  if (insights.action_items && insights.action_items.length > 0) {
    text += `\nRECOMMENDED ACTIONS:\n`;
    insights.action_items.forEach((action, index) => {
      text += `${index + 1}. ${action}\n`;
    });
  }
  
  // Generate HTML version
  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background-color: #f0f0f0; padding: 20px; border-bottom: 3px solid #ddd; }
          .header h1 { margin: 0; color: #444; }
          .content { padding: 20px; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #3a7ca5; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .metric { display: inline-block; margin: 10px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; min-width: 100px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #2c5d8d; }
          .metric-label { font-size: 12px; color: #777; text-transform: uppercase; }
          .insight-item { margin-bottom: 10px; padding-left: 20px; position: relative; }
          .insight-item:before { content: "•"; position: absolute; left: 0; color: #3a7ca5; }
          .action-item { background-color: #ffffe0; padding: 10px; margin-bottom: 10px; border-left: 3px solid #e6db55; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${platform} Insights</h1>
            <p>For ${roleTitle} - Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h2>Key Insights</h2>
  `;
  
  if (insights.insights && insights.insights.length > 0) {
    insights.insights.forEach(insight => {
      html += `<div class="insight-item">${insight}</div>`;
    });
  } else {
    html += `<p>No insights available.</p>`;
  }
  
  html += `
            </div>
            
            <div class="section">
              <h2>Key Metrics</h2>
  `;
  
  if (insights.key_metrics) {
    Object.entries(insights.key_metrics).forEach(([key, value]) => {
      html += `
        <div class="metric">
          <div class="metric-value">${value}</div>
          <div class="metric-label">${key.replace(/_/g, ' ')}</div>
        </div>
      `;
    });
  } else {
    html += `<p>No metrics available.</p>`;
  }
  
  html += `
            </div>
  `;
  
  if (insights.action_items && insights.action_items.length > 0) {
    html += `
            <div class="section">
              <h2>Recommended Actions</h2>
    `;
    
    insights.action_items.forEach(action => {
      html += `<div class="action-item">${action}</div>`;
    });
    
    html += `
            </div>
    `;
  }
  
  html += `
          </div>
          
          <div class="footer">
            <p>This is an automated insight report. Please do not reply to this email.</p>
            <p>Powered by AgentFlow AI</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return { subject, text, html };
}

/**
 * Distribute insights via file
 * @param {Object} insights - Insights to distribute
 * @param {string} role - Recipient role
 * @param {string} platform - CRM platform name
 * @returns {Promise<boolean>} Success status
 */
async function distributeViaFile(insights, role, platform) {
  try {
    // Create role-specific directory for insights
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const baseDir = path.join(process.cwd(), 'results', platform, dateStr, 'distributions', role);
    
    // Ensure directory exists
    await fs.promises.mkdir(baseDir, { recursive: true });
    
    // Generate filename with timestamp
    const timestamp = Date.now();
    const filename = `${platform}-${role}-${timestamp}.json`;
    const filePath = path.join(baseDir, filename);
    
    // Write insights to file
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(insights, null, 2),
      'utf8'
    );
    
    console.log(`Insights saved to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error distributing via file:`, error);
    throw error;
  }
}

/**
 * Get or create email transport
 * @returns {Promise<nodemailer.Transporter>} Nodemailer transport
 */
async function getEmailTransport() {
  // Check for environment variables
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Use configured SMTP
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  
  // Use ethereal for testing
  const testAccount = await nodemailer.createTestAccount();
  console.log('Nodemailer test account created for fallback');
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

/**
 * Get distribution configurations
 * This would typically be loaded from a database or config file
 * @param {string} platform - CRM platform name
 * @returns {Promise<Array>} Distribution configurations
 */
async function getDistributionConfigs(platform) {
  console.log('Creating distribution configurations for different roles...');
  
  // In a real system, this would be fetched from the database
  // For now, we'll return a static configuration for testing
  
  const configs = [
    {
      role: 'EXECUTIVE',
      recipient: {
        name: 'John Executive',
        email: process.env.TEST_EMAIL_ADDRESS || 'executive@example.com'
      },
      channels: ['EMAIL', 'FILE']
    },
    {
      role: 'SALES_MANAGER',
      recipient: {
        name: 'Mary Manager',
        email: process.env.TEST_EMAIL_ADDRESS || 'manager@example.com'
      },
      channels: ['FILE']
    },
    {
      role: 'MARKETING',
      recipient: {
        name: 'Dave Marketing',
        email: process.env.TEST_EMAIL_ADDRESS || 'marketing@example.com'
      },
      channels: ['FILE']
    }
  ];
  
  return configs;
}

/**
 * Generate role-specific insights based on the complete insights and role
 * @param {Object} insights - Complete insights object
 * @param {string} role - Role identifier (from STAKEHOLDER_ROLES)
 * @returns {Object} Role-specific insights
 */
function generateRoleSpecificInsights(insights, role) {
  // Get the role definition and focus areas
  const roleDef = STAKEHOLDER_ROLES[role] || STAKEHOLDER_ROLES.GENERAL_MANAGER;
  
  // For general manager, return all insights
  if (role === 'GENERAL_MANAGER') {
    return { ...insights };
  }
  
  // Create a copy of the insights to modify
  const roleInsights = {
    ...insights,
    role_specific: true,
    for_role: roleDef.name
  };
  
  // Filter insights relevant to the role
  if (insights.insights && Array.isArray(insights.insights)) {
    roleInsights.insights = insights.insights.filter(insight => 
      roleDef.focusAreas.some(focus => 
        insight.toLowerCase().includes(focus.toLowerCase())
      )
    );
  }
  
  // If we filtered out everything, include the first few anyway
  if (roleInsights.insights.length === 0 && insights.insights) {
    roleInsights.insights = insights.insights.slice(0, 3);
  }
  
  // Filter action items relevant to the role
  if (insights.action_items && Array.isArray(insights.action_items)) {
    roleInsights.action_items = insights.action_items.filter(action => 
      roleDef.focusAreas.some(focus => 
        action.toLowerCase().includes(focus.toLowerCase())
      )
    );
    
    // If we filtered out everything, include the first few anyway
    if (roleInsights.action_items.length === 0) {
      roleInsights.action_items = insights.action_items.slice(0, 2);
    }
  }
  
  // Filter metrics to include only relevant ones
  if (insights.key_metrics && typeof insights.key_metrics === 'object') {
    const relevantMetrics = {};
    
    // If role wants all metrics, copy them all
    if (roleDef.metrics.includes('all')) {
      Object.assign(relevantMetrics, insights.key_metrics);
    } else {
      // Copy only metrics relevant to the role
      for (const metricKey of roleDef.metrics) {
        if (insights.key_metrics[metricKey] !== undefined) {
          relevantMetrics[metricKey] = insights.key_metrics[metricKey];
        }
      }
      
      // Always include a few common metrics if available
      const commonMetrics = ['total_sales', 'average_price', 'total_revenue'];
      for (const metric of commonMetrics) {
        if (insights.key_metrics[metric] !== undefined && relevantMetrics[metric] === undefined) {
          relevantMetrics[metric] = insights.key_metrics[metric];
        }
      }
    }
    
    roleInsights.key_metrics = relevantMetrics;
  }
  
  return roleInsights;
}

/**
 * Add a new stakeholder recipient to the distribution list
 * This would typically interact with a database in a real system
 * @param {Object} stakeholder - Stakeholder details
 * @returns {Promise<Object>} Result with success status
 */
export async function addStakeholder(stakeholder) {
  try {
    if (!stakeholder.email || !stakeholder.role) {
      throw new Error('Email and role are required');
    }
    
    // Validate role
    if (!STAKEHOLDER_ROLES[stakeholder.role]) {
      throw new Error(`Invalid role: ${stakeholder.role}`);
    }
    
    // In a real system, this would save to a database
    // For this demo, we'll just log it
    console.log(`Added stakeholder: ${stakeholder.name} (${stakeholder.email}) as ${stakeholder.role}`);
    
    return {
      success: true,
      message: 'Stakeholder added successfully',
      stakeholder: {
        id: uuidv4(),
        ...stakeholder,
        created: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error adding stakeholder:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get distribution channels
 * @returns {Object} Available distribution channels
 */
export function getDistributionChannels() {
  return { ...DISTRIBUTION_CHANNELS };
}

/**
 * Get stakeholder roles
 * @returns {Object} Available stakeholder roles
 */
export function getStakeholderRoles() {
  return { ...STAKEHOLDER_ROLES };
}