/**
 * Email Templates Service
 * Provides templates for various email types in the application
 */
/**
 * Generate a workflow summary email (HTML)
 */
export function generateWorkflowSummaryHtml(data) {
    const duration = data.completedAt && data.createdAt
        ? getDurationString(new Date(data.createdAt), new Date(data.completedAt))
        : 'N/A';
    const statusColor = getStatusColor(data.workflowStatus);
    const formattedDate = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    let insightsHtml = '';
    if (data.insights && data.insights.length > 0) {
        insightsHtml = `
      <h3 style="color: #333; margin-top: 20px; margin-bottom: 10px;">Key Insights:</h3>
      <ul style="margin-top: 0; padding-left: 20px;">
        ${data.insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('')}
      </ul>
    `;
    }
    let errorHtml = '';
    if (data.error) {
        errorHtml = `
      <div style="background-color: #fff1f0; border-left: 4px solid #ff4d4f; padding: 12px; margin: 16px 0;">
        <h3 style="color: #cf1322; margin-top: 0; margin-bottom: 8px;">Error Details:</h3>
        <p style="margin: 0; color: #434343;">${data.error}</p>
      </div>
    `;
    }
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workflow Summary</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border: 1px solid #e8e8e8; border-radius: 4px; overflow: hidden;">
        <div style="background-color: #f5f5f5; padding: 16px; border-bottom: 1px solid #e8e8e8;">
          <h2 style="margin: 0; color: #333;">Workflow Summary Report</h2>
          <p style="margin: 8px 0 0 0; color: #666;">${formattedDate}</p>
        </div>
        
        <div style="padding: 20px;">
          <div style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: bold; width: 120px;">Workflow ID:</span>
              <span>${data.workflowId}</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: bold; width: 120px;">Status:</span>
              <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 14px; background-color: ${statusColor.bg}; color: ${statusColor.text};">
                ${data.workflowStatus.toUpperCase()}
              </span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: bold; width: 120px;">Duration:</span>
              <span>${duration}</span>
            </div>
          </div>
          
          ${data.summary ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0; margin-bottom: 10px;">Summary:</h3>
            <p style="margin: 0;">${data.summary}</p>
          </div>
          ` : ''}
          
          ${insightsHtml}
          ${errorHtml}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
/**
 * Generate a workflow summary email (plain text)
 */
export function generateWorkflowSummaryText(data) {
    const duration = data.completedAt && data.createdAt
        ? getDurationString(new Date(data.createdAt), new Date(data.completedAt))
        : 'N/A';
    const formattedDate = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    let insightsText = '';
    if (data.insights && data.insights.length > 0) {
        insightsText = `
KEY INSIGHTS:
${data.insights.map(insight => `- ${insight}`).join('\n')}
`;
    }
    let errorText = '';
    if (data.error) {
        errorText = `
ERROR DETAILS:
${data.error}
`;
    }
    return `
WORKFLOW SUMMARY REPORT
${formattedDate}

Workflow ID: ${data.workflowId}
Status: ${data.workflowStatus.toUpperCase()}
Duration: ${duration}

${data.summary ? `SUMMARY:
${data.summary}

` : ''}${insightsText}${errorText}
---
This is an automated email. Please do not reply to this message.
`;
}
/**
 * Format duration between two dates
 */
function getDurationString(startDate, endDate) {
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationSec = Math.floor(durationMs / 1000);
    if (durationSec < 60) {
        return `${durationSec} seconds`;
    }
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    if (minutes < 60) {
        return `${minutes} min ${seconds} sec`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
}
/**
 * Get color for workflow status
 */
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'completed':
            return { bg: '#f6ffed', text: '#52c41a' };
        case 'failed':
            return { bg: '#fff1f0', text: '#f5222d' };
        case 'running':
            return { bg: '#e6f7ff', text: '#1890ff' };
        case 'pending':
            return { bg: '#fffbe6', text: '#faad14' };
        case 'paused':
            return { bg: '#f5f5f5', text: '#8c8c8c' };
        default:
            return { bg: '#f5f5f5', text: '#595959' };
    }
}
//# sourceMappingURL=emailTemplates.js.map