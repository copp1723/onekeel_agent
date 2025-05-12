/**
 * Email Templates Module
 * Generates email content for workflow notifications
 */

/**
 * Generate plain text email content for workflow notification
 * @param {object} workflow - The workflow object
 * @returns {string} Plain text email content
 */
export function generateWorkflowSummaryText(workflow) {
  const { id, name, status, currentStep, totalSteps, createdAt, updatedAt, context = {} } = workflow;
  
  // Format timestamps
  const startTime = createdAt ? new Date(createdAt).toLocaleString() : 'Unknown';
  const endTime = updatedAt ? new Date(updatedAt).toLocaleString() : 'Unknown';
  
  // Calculate duration if possible
  let duration = '';
  if (createdAt && updatedAt) {
    const start = new Date(createdAt).getTime();
    const end = new Date(updatedAt).getTime();
    const seconds = Math.floor((end - start) / 1000);
    
    if (seconds < 60) {
      duration = `${seconds} seconds`;
    } else if (seconds < 3600) {
      duration = `${Math.floor(seconds / 60)} minutes, ${seconds % 60} seconds`;
    } else {
      duration = `${Math.floor(seconds / 3600)} hours, ${Math.floor((seconds % 3600) / 60)} minutes`;
    }
  }
  
  // Start building the email content
  let text = `
WORKFLOW SUMMARY
===============

Workflow: ${name || 'Unnamed Workflow'}
ID: ${id}
Status: ${status.toUpperCase()}
Progress: Step ${currentStep || 0}/${totalSteps || '?'}
Started: ${startTime}
${status === 'completed' || status === 'failed' ? `Completed: ${endTime}` : ''}
${duration ? `Duration: ${duration}` : ''}

`;

  // Add insights if available
  if (context && context.__lastStepResult && context.__lastStepResult.insights) {
    text += `
INSIGHTS
-------
`;
    
    if (Array.isArray(context.__lastStepResult.insights)) {
      context.__lastStepResult.insights.forEach(insight => {
        text += `- ${insight}\n`;
      });
    } else if (typeof context.__lastStepResult.insights === 'object') {
      Object.entries(context.__lastStepResult.insights).forEach(([key, value]) => {
        text += `- ${key}: ${value}\n`;
      });
    } else {
      text += context.__lastStepResult.insights;
    }
  }
  
  // Add summary if available
  if (context && context.__lastStepResult && context.__lastStepResult.summary) {
    text += `
SUMMARY
-------
${context.__lastStepResult.summary}
`;
  }
  
  // Add error information if workflow failed
  if (status === 'failed' && context && context.error) {
    text += `
ERROR
-----
${context.error.message || context.error}
`;
  }
  
  // Add footer
  text += `
---
This is an automated email from the Workflow System.
Please do not reply to this email.
`;
  
  return text;
}

/**
 * Generate HTML email content for workflow notification
 * @param {object} workflow - The workflow object
 * @returns {string} HTML email content
 */
export function generateWorkflowSummaryHtml(workflow) {
  const { id, name, status, currentStep, totalSteps, createdAt, updatedAt, context = {} } = workflow;
  
  // Format timestamps
  const startTime = createdAt ? new Date(createdAt).toLocaleString() : 'Unknown';
  const endTime = updatedAt ? new Date(updatedAt).toLocaleString() : 'Unknown';
  
  // Calculate duration if possible
  let duration = '';
  if (createdAt && updatedAt) {
    const start = new Date(createdAt).getTime();
    const end = new Date(updatedAt).getTime();
    const seconds = Math.floor((end - start) / 1000);
    
    if (seconds < 60) {
      duration = `${seconds} seconds`;
    } else if (seconds < 3600) {
      duration = `${Math.floor(seconds / 60)} minutes, ${seconds % 60} seconds`;
    } else {
      duration = `${Math.floor(seconds / 3600)} hours, ${Math.floor((seconds % 3600) / 60)} minutes`;
    }
  }
  
  // Status color
  const statusColor = status === 'completed' ? '#4caf50' : 
                       status === 'failed' ? '#f44336' : 
                       status === 'running' ? '#2196f3' : '#ff9800';
  
  // Generate insights HTML if available
  let insightsHtml = '';
  if (context && context.__lastStepResult && context.__lastStepResult.insights) {
    if (Array.isArray(context.__lastStepResult.insights)) {
      insightsHtml = context.__lastStepResult.insights.map(insight => 
        `<li style="margin-bottom: 8px;">${insight}</li>`
      ).join('');
    } else if (typeof context.__lastStepResult.insights === 'object') {
      insightsHtml = Object.entries(context.__lastStepResult.insights).map(([key, value]) => 
        `<li style="margin-bottom: 8px;"><strong>${key}:</strong> ${value}</li>`
      ).join('');
    } else {
      insightsHtml = `<p>${context.__lastStepResult.insights}</p>`;
    }
  }
  
  // Generate summary HTML if available
  let summaryHtml = '';
  if (context && context.__lastStepResult && context.__lastStepResult.summary) {
    summaryHtml = `
      <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #2c3e50;">Summary</h3>
        <p>${context.__lastStepResult.summary}</p>
      </div>
    `;
  }
  
  // Generate error HTML if workflow failed
  let errorHtml = '';
  if (status === 'failed' && context && context.error) {
    errorHtml = `
      <div style="margin-top: 20px; padding: 15px; background-color: #ffebee; border-radius: 4px; border-left: 4px solid #f44336;">
        <h3 style="margin-top: 0; color: #d32f2f;">Error</h3>
        <p style="font-family: monospace;">${context.error.message || context.error}</p>
      </div>
    `;
  }
  
  // Build the complete HTML email
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 4px;">
      <h1 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Workflow Summary</h1>
      
      <div style="margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Workflow:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${name || 'Unnamed Workflow'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${id}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Status:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <span style="display: inline-block; padding: 2px 8px; background-color: ${statusColor}; color: white; border-radius: 4px;">${status.toUpperCase()}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Progress:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">Step ${currentStep || 0}/${totalSteps || '?'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Started:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${startTime}</td>
          </tr>
          ${status === 'completed' || status === 'failed' ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Completed:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${endTime}</td>
          </tr>
          ` : ''}
          ${duration ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Duration:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${duration}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      ${insightsHtml ? `
      <div style="margin-top: 30px;">
        <h2 style="color: #2c3e50;">Insights</h2>
        <ul style="padding-left: 20px; line-height: 1.6;">
          ${insightsHtml}
        </ul>
      </div>
      ` : ''}
      
      ${summaryHtml}
      
      ${errorHtml}
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #7f8c8d; font-size: 12px;">
        <p>This is an automated email from the Workflow System.</p>
        <p>Please do not reply to this email.</p>
      </div>
    </div>
  `;
}