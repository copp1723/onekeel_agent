# IMAP Ingestion System

This document describes the enhanced IMAP ingestion system for retrieving CRM reports via email.

## Overview

The IMAP ingestion system provides a reliable way to retrieve CRM reports that are delivered via scheduled emails. It replaces the previous hybrid approach that used Playwright browser automation as a fallback.

Key features:
- Database-driven configuration for IMAP search criteria
- Support for multiple attachments in a single email
- Pagination for processing large numbers of emails
- Reconnect logic with exponential backoff
- Health check monitoring
- Admin alerts for critical errors

## Components

### 1. IMAP Filters Table

The system uses a database table (`imap_filters`) to store search criteria for each platform:

| Column        | Description                                      |
|---------------|--------------------------------------------------|
| id            | Unique identifier                                |
| platform      | CRM platform name (e.g., "VinSolutions")         |
| from_address  | Email sender address to filter by                |
| subject_regex | Regular expression to match email subjects       |
| days_back     | Number of days to look back for emails           |
| file_pattern  | Regular expression to match attachment filenames |
| active        | Whether this filter is active                    |

This allows changing search criteria without code changes.

### 2. IMAP Ingestion Service

The core service (`imapIngestionService.ts`) handles:
- Connecting to the IMAP server
- Searching for emails based on configured criteria
- Downloading and saving attachments
- Error handling with retries and circuit breaker
- Health check monitoring

### 3. Email Ingest Service

The high-level service (`emailIngestService.ts`) orchestrates:
- Fetching emails with attachments
- Parsing attachments based on file type
- Storing results in the database
- Generating insights from parsed data

### 4. Health Check System

The health check system monitors the IMAP connection:
- Periodic health checks (every 5 minutes)
- Status tracking in the database
- Admin alerts for connection failures

## Configuration

### Environment Variables

The following environment variables are required:

- `EMAIL_USER`: Email account username
- `EMAIL_PASS`: Email account password
- `EMAIL_HOST`: IMAP server hostname
- `EMAIL_PORT`: IMAP server port (default: 993)
- `EMAIL_TLS`: Use TLS (default: true)
- `ADMIN_EMAILS`: Comma-separated list of admin email addresses for alerts

### Database Configuration

To add or modify IMAP filters, update the `imap_filters` table:

```sql
INSERT INTO imap_filters 
  (platform, from_address, subject_regex, days_back, file_pattern, active)
VALUES
  ('PlatformName', 'reports@example.com', 'Report Export', 7, '\\.csv$', true);
```

## Usage

### Basic Usage

```javascript
import { ingestReportFromEmail } from './src/agents/emailIngestService.js';

const result = await ingestReportFromEmail('VinSolutions', {
  downloadDir: './downloads',
  intent: 'sales_report',
  generateInsights: true,
  storeResults: true,
});

if (result.success) {
  console.log(`Successfully ingested report: ${result.filePaths.join(', ')}`);
} else {
  console.error(`Failed to ingest report: ${result.error}`);
}
```

### Testing

Use the test script to test the email ingestion:

```bash
npm run test:email-ingestion VinSolutions
```

### Health Check

Run a manual health check:

```bash
npm run health-check:imap
```

## Best Practices

1. Set up email filters to organize CRM reports into specific folders
2. Configure consistent report delivery schedules
3. Use standardized report formats and naming conventions
4. Set up alerts for failed report deliveries

## Troubleshooting

Common issues and solutions:

1. **Authentication Failures**:
   - Verify email credentials are correct
   - For Gmail, enable "Less secure app access" or use app passwords
   - Check for account lockouts due to security policies

2. **No Reports Found**:
   - Verify the IMAP filter configuration matches the actual emails
   - Check if emails are being delivered to a different folder
   - Ensure the report emails are not being marked as spam

3. **Connection Issues**:
   - Check network connectivity to the IMAP server
   - Verify firewall rules allow IMAP traffic
   - Check if the IMAP server has connection limits

4. **Attachment Processing Errors**:
   - Verify the attachment format matches the expected format
   - Check for corrupted attachments
   - Ensure the file pattern regex is correct
