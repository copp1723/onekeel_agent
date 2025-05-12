# Automated Email Notifications System

This document describes the automated email notification system for workflow events, including how to configure it and how to use it.

## Overview

The system automatically sends email notifications when a workflow completes or fails, based on configured notification rules. It supports:

- Email notifications for workflow completion and failure events
- Configurable recipients per workflow type or platform
- Template-based email formatting with insights inclusion
- Notification delivery tracking and retry functionality
- Integration with the workflow service for automatic status-based notifications

## Components

The email notification system consists of several key components:

1. **Fixed Mailer Service** (`fixed-mailerService.js`)
   - Core email sending functionality
   - SendGrid integration with Nodemailer fallback
   - Email log tracking in database

2. **Workflow Email Service** (`fixed-workflowEmailService.js`) 
   - Workflow status notification processing
   - Email template management
   - Notification configuration

3. **Email Templates** (`emailTemplates.js`)
   - HTML and text templates for workflow status emails
   - Insight formatting

4. **Database Schema** (`schema.js`)
   - `email_notifications` table for notification settings
   - `email_logs` table for tracking delivery status

## Configuration

### Setting Up Email Notification Rules

To configure email notifications for workflows, use the `configureEmailNotifications` function or the API endpoint:

```javascript
// Example: Configure email notifications programmatically
const settings = await configureEmailNotifications({
  workflowType: 'crm',              // Optional workflow type filter
  platform: 'VinSolutions',         // Optional platform filter
  recipients: ['user@example.com'], // Email recipients (required)
  sendOnCompletion: true,           // Send when workflows complete
  sendOnFailure: true,              // Send when workflows fail
  includeInsights: true,            // Include insights in email
  enabled: true                     // Enable/disable this rule
});
```

### API Endpoints

The system exposes several RESTful API endpoints:

- `POST /api/emails/notifications` - Configure email notification settings
- `GET /api/emails/notifications` - Get email notification settings
- `DELETE /api/emails/notifications/:id` - Delete notification settings
- `GET /api/emails/logs/:workflowId` - Get email logs for a workflow
- `POST /api/emails/retry/:emailLogId` - Retry a failed email

## Usage

### Automatic Notifications

The system automatically sends emails when:

1. A workflow status changes to `completed`
2. A workflow status changes to `failed`

This occurs when the `processWorkflowStatusNotifications(workflowId)` function is called, which happens automatically at the appropriate stages of workflow execution.

### Manual Sending

You can also manually send workflow emails using:

```javascript
// Send to specific recipients regardless of configuration
const result = await sendWorkflowCompletionEmail(workflowId, 'user@example.com');
```

## Email Content

The emails include:

- Workflow status (Completed/Failed)
- Workflow ID and details
- Execution time information
- Summary of results (if available)
- List of insights (if available and enabled)
- Error details (for failed workflows)

## Testing

Use the following test scripts to verify functionality:

- `test-workflow-auto-notifications.js` - Test end-to-end automated notifications
- `test-fixed-workflow-email.js` - Test sending workflow completion emails
- `test-email-delivery.js` - Test basic email delivery

## Environment Variables

The system requires the following environment variables:

- `SENDGRID_API_KEY` - SendGrid API key for email delivery

## Integration with Other Components

The email notification system is integrated with:

1. **Workflow Service** - Automated email sending on workflow status changes
2. **Task Execution System** - Notification of task execution errors
3. **Scheduler** - Email notifications for scheduled workflow results

## Extending

To extend the email notification system:

1. Add new email templates in `emailTemplates.js`
2. Extend notification rules in `fixed-workflowEmailService.js`
3. Add new API endpoints in `fixed-emails.js`