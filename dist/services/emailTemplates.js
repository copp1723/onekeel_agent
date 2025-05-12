/**
 * Email Templates for Workflow System
 * Generates formatted email content for workflow notifications
 */

/**
 * Generate plain text email for workflow summary
 * @param {object} data Workflow data for email
 * @returns {string} Plain text email content
 */
export function generateWorkflowSummaryText(data) {
  // Start with the header
  let text = `WORKFLOW SUMMARY: ${data.workflowId}\n`;
  text += `${'='.repeat(40)}\n\n`;
  
  // Add status 
  text += `Status: ${data.workflowStatus.toUpperCase()}\n\n`;
  
  // Add timing information
  text += `Created: ${formatDate(data.createdAt)}\n`;
  if (data.completedAt) {
    text += `Completed: ${formatDate(data.completedAt)}\n`;
  }
  text += '\n';
  
  // Add summary if available
  if (data.summary) {
    text += `SUMMARY:\n${data.summary}\n\n`;
  }
  
  // Add error if present
  if (data.error) {
    text += `ERROR:\n${data.error}\n\n`;
  }
  
  // Add insights if available
  if (data.insights && data.insights.length > 0) {
    text += 'KEY INSIGHTS:\n';
    data.insights.forEach((insight, i) => {
      text += `${i+1}. ${insight}\n`;
    });
    text += '\n';
  }
  
  return text;
}

/**
 * Generate HTML email for workflow summary
 * @param {object} data Workflow data for email
 * @returns {string} HTML email content
 */
export function generateWorkflowSummaryHtml(data) {
  // Create an HTML template with basic styling
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .container {
          padding: 20px;
        }
        .header {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px 5px 0 0;
          border-bottom: 2px solid #ddd;
        }
        .content {
          padding: 15px;
          background-color: #fff;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 5px 5px;
        }
        h1 {
          color: #2c3e50;
          margin: 0;
          font-size: 1.5em;
        }
        .status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          color: white;
          font-weight: bold;
          margin: 10px 0;
        }
        .completed {
          background-color: #27ae60;
        }
        .failed {
          background-color: #e74c3c;
        }
        .pending, .running, .paused {
          background-color: #3498db;
        }
        .section {
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        .error {
          background-color: #ffecec;
          color: #e74c3c;
          padding: 10px;
          border-left: 4px solid #e74c3c;
          margin: 10px 0;
        }
        .insights-list {
          list-style-type: none;
          padding-left: 0;
        }
        .insights-list li {
          padding: 8px 0;
          border-bottom: 1px solid #f6f6f6;
        }
        .insights-list li:before {
          content: "• ";
          color: #3498db;
          font-weight: bold;
          margin-right: 5px;
        }
        .footer {
          margin-top: 20px;
          font-size: 0.8em;
          color: #7f8c8d;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Workflow Summary</h1>
          <div class="status ${data.workflowStatus.toLowerCase()}">${data.workflowStatus.toUpperCase()}</div>
        </div>
        <div class="content">
          <div class="section">
            <strong>Workflow ID:</strong> ${data.workflowId}<br>
            <strong>Created:</strong> ${formatDate(data.createdAt)}<br>
            ${data.completedAt ? `<strong>Completed:</strong> ${formatDate(data.completedAt)}<br>` : ''}
          </div>
  `;
  
  // Add summary if available
  if (data.summary) {
    html += `
          <div class="section">
            <h2>Summary</h2>
            <p>${data.summary}</p>
          </div>
    `;
  }
  
  // Add error information if available
  if (data.error) {
    html += `
          <div class="section">
            <h2>Error</h2>
            <div class="error">${data.error}</div>
          </div>
    `;
  }
  
  // Add insights if available
  if (data.insights && data.insights.length > 0) {
    html += `
          <div class="section">
            <h2>Key Insights</h2>
            <ul class="insights-list">
    `;
    
    data.insights.forEach(insight => {
      html += `              <li>${insight}</li>\n`;
    });
    
    html += `
            </ul>
          </div>
    `;
  }
  
  // Close the HTML
  html += `
        </div>
        <div class="footer">
          This is an automated message from the Workflow System
        </div>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Format a date object or string to a readable format
 * @param {Date|string} date Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return 'N/A';
  
  try {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return String(date);
  }
}