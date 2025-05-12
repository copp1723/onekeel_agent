# Email Notifications System

This document describes the automated email notification system that sends workflow status emails to designated recipients.

## Overview

The email notification system allows users to configure automatic email notifications for workflows. These notifications can be sent when a workflow completes successfully or fails.

## Features

- Configure email notifications for specific workflows
- Send notifications on workflow completion or failure
- Include workflow insights in emails
- Track email delivery status and errors
- Retry failed emails
- Extensible design for future enhancements

## Configuration

You can configure email notifications using the following API endpoints:

### Configure Email Notifications

```
POST /api/emails/notifications
```

Request body:
```json
{
  "workflowId": "workflow-uuid-here",
  "recipientEmail": "user@example.com",
  "sendOnCompletion": true,
  "sendOnFailure": true
}
```

### Get Email Notification Settings

```
GET /api/emails/notifications
```

Optional query parameters:
- `workflowId`: Filter by workflow ID
- `recipientEmail`: Filter by recipient email

### Delete Email Notification Settings

```
DELETE /api/emails/notifications/:id
```

Where `:id` is the notification settings ID.

### Get Email Logs

```
GET /api/emails/logs/:workflowId
```

Where `:workflowId` is the workflow ID to get logs for.

### Retry Failed Email

```
POST /api/emails/retry/:emailLogId
```

Where `:emailLogId` is the ID of the failed email log to retry.

## Usage in Code

You can also use the email notification system in your code:

```javascript
import { processWorkflowStatusNotifications } from './services/fixed-workflowEmailService.js';

// After updating workflow status to 'completed' or 'failed'
await processWorkflowStatusNotifications(workflowId);
```

## Email Content

The email content includes:
- Workflow summary information
- Status (completed or failed)
- Execution time
- Steps executed
- Insights generated (if available and configured)

## Troubleshooting

Common issues:

1. **Emails not being sent**: Make sure you have configured SendGrid API key correctly in your environment variables. The system will automatically fall back to using Nodemailer for development/testing.

2. **Missing notifications**: Ensure that notification settings exist for the workflow and that they are configured to send on the appropriate status.

3. **Database errors**: If you encounter database errors, check that your database schema is up to date by running the necessary migration scripts.

## Testing

You can test the email notification system using the following script:

```bash
node test-workflow-auto-notifications.js recipient@example.com
```

This will create a test workflow, configure notifications, mark it as completed, and trigger the notification process.