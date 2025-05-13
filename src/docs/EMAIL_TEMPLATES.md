# Email Template System

## Overview

The Email Template System provides a standardized way to create and send emails with consistent formatting. It supports both HTML and plain text emails, with variable substitution for dynamic content.

## Features

- Template-based email generation
- Support for HTML and plain text formats
- Variable substitution using `{{variable}}` syntax
- Conditional blocks using `{{#if variable}}...{{/if}}`
- Iteration over arrays using `{{#each array}}...{{/each}}`
- Built-in templates for common email types:
  - Notification
  - Alert
  - Report

## Usage

### Basic Usage

```typescript
import { sendTemplatedEmail } from '../services/emailTemplateService.js';

// Send a templated email
await sendTemplatedEmail({
  to: 'recipient@example.com',
  templateType: 'notification',
  templateData: {
    title: 'New Notification',
    message: 'This is a notification message.',
    actionUrl: 'https://example.com/action',
    actionText: 'View Details'
  }
});
```

### Convenience Methods

The system provides convenience methods for common email types:

```typescript
import { 
  sendNotificationEmail, 
  sendAlertEmail, 
  sendReportEmail 
} from '../services/emailTemplateService.js';

// Send a notification email
await sendNotificationEmail(
  'recipient@example.com',
  'New Notification',
  'This is a notification message.',
  {
    actionUrl: 'https://example.com/action',
    actionText: 'View Details'
  }
);

// Send an alert email
await sendAlertEmail(
  'recipient@example.com',
  'System Alert',
  'An error occurred in the system.',
  {
    detailItems: [
      { label: 'Error Code', value: 'E1001' },
      { label: 'Component', value: 'Database' },
      { label: 'Time', value: '2023-05-16 14:30:00' }
    ]
  }
);

// Send a report email
await sendReportEmail(
  'recipient@example.com',
  'Monthly Report',
  'Here is your monthly report for May 2023.',
  {
    summary: 'Overall performance has improved by 15% compared to last month.',
    metrics: [
      { label: 'Total Users', value: '1,234' },
      { label: 'New Users', value: '123' },
      { label: 'Revenue', value: '$12,345' }
    ],
    tableTitle: 'Top Performing Products',
    tableHeaders: ['Product', 'Sales', 'Revenue'],
    tableData: true,
    tableRows: [
      ['Product A', '123', '$1,234'],
      ['Product B', '456', '$4,567'],
      ['Product C', '789', '$7,890']
    ]
  }
);
```

## Template Variables

### Common Variables

All templates support the following variables:

- `{{title}}` - Email title
- `{{message}}` - Main message content
- `{{date}}` - Formatted date (defaults to current date if not provided)
- `{{actionUrl}}` - URL for the call-to-action button
- `{{actionText}}` - Text for the call-to-action button
- `{{unsubscribeUrl}}` - URL for unsubscribing from emails

### Notification Template

The notification template supports:

- All common variables
- `{{detailItems}}` - Array of detail items with `label` and `value` properties

### Alert Template

The alert template supports:

- All common variables
- `{{detailItems}}` - Array of detail items with `label` and `value` properties

### Report Template

The report template supports:

- All common variables
- `{{summary}}` - Summary text for the report
- `{{metrics}}` - Array of metrics with `label` and `value` properties
- `{{tableTitle}}` - Title for the data table
- `{{tableHeaders}}` - Array of column headers for the data table
- `{{tableRows}}` - 2D array of table data

## Creating Custom Templates

To create a custom template:

1. Create HTML and text versions of your template:
   - `src/services/emailTemplates/your-template-name.html`
   - `src/services/emailTemplates/your-template-name.txt`

2. Use the template in your code:

```typescript
await sendTemplatedEmail({
  to: 'recipient@example.com',
  templateType: 'your-template-name',
  templateData: {
    // Your template variables
  }
});
```

### Template Syntax

Templates use a simple variable substitution syntax:

- `{{variable}}` - Outputs the value of the variable
- `{{#if variable}}...{{/if}}` - Conditional block that only renders if the variable is truthy
- `{{#each array}}...{{/each}}` - Iterates over an array
  - Use `{{this}}` to reference the current item
  - For objects, use `{{this.property}}` to access properties

## Best Practices

1. **Use the right template for the right purpose**:
   - Notifications for general updates
   - Alerts for important warnings or errors
   - Reports for data summaries

2. **Keep emails concise and focused**:
   - Clear subject lines
   - Brief, actionable content
   - Minimal use of images and formatting

3. **Always provide plain text alternatives**:
   - Some email clients don't support HTML
   - Some users prefer plain text emails

4. **Test emails in multiple clients**:
   - Different email clients render HTML differently
   - Test in popular clients like Gmail, Outlook, and Apple Mail

5. **Include unsubscribe options**:
   - Required by anti-spam laws in many countries
   - Improves user experience
