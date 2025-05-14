# Email-Only Ingestion for CRM Reports

This document explains the email-only approach for ingesting CRM reports from various platforms like VinSolutions and VAUTO.

## Overview

The email-only ingestion approach provides a reliable method for retrieving CRM reports directly from configured email accounts. This approach:

1. Connects to an email account using IMAP
2. Searches for emails containing reports from specific CRM platforms
3. Downloads and processes the attachments
4. Returns the path to the downloaded report

## Setup and Configuration

### Required Environment Variables

#### Email Configuration
- `EMAIL_USER`: Email account username
- `EMAIL_PASS`: Email account password
- `EMAIL_HOST`: IMAP server hostname (e.g., 'imap.gmail.com')
- `EMAIL_PORT`: IMAP server port (default: 993)
- `EMAIL_TLS`: Use TLS for connection (default: true)

#### Download Settings
- `DOWNLOAD_DIR`: Directory for saving downloaded reports (default: `./downloads`)

### Testing Configuration
- `USE_SAMPLE_DATA`: Set to 'true' to use sample data instead of actual email ingestion

## Implementation Components

### 1. Email OTP Retrieval (`src/utils/emailOTP.js`)

Provides functionality to:
- Connect to email accounts via IMAP
- Search for specific messages containing OTP codes
- Extract and return OTP codes using regular expressions

### 2. Email-Only Ingestion Orchestrator (`src/agents/emailIngestAndRunFlow.js`)

Coordinates the email ingestion process:
- Attempts to fetch reports from scheduled emails
- Provides detailed error handling and diagnostics
- Returns the path to the downloaded report

### 3. Email Ingestion Agent (`src/agents/emailIngestForCRM.js`)

Handles the email-based ingestion:
- Searches for reports in configured email accounts
- Downloads attachments and saves them to the specified directory
- Provides detailed error handling for email-related issues

## Testing

You can test the email-only ingestion approach using:

```
node test-email-ingestion.js VinSolutions
```

For testing without making actual API calls:

```
USE_SAMPLE_DATA=true node test-email-ingestion.js VinSolutions
```

## Integration with CRM Analysis Flow

The email-only ingestion module integrates with the CRM analysis pipeline:

1. Email-only ingestion retrieves the report
2. Report is parsed and processed
3. Data is analyzed using the automotive analyst LLM system
4. Structured insights are generated

## Error Handling

The system implements sophisticated error handling:

- Email configuration errors: Checks for required environment variables
- Authentication failures: Proper error messages for email login issues
- Connection issues: Handles network interruptions and timeouts
- Report not found: Clear error messages when no reports are found

## Advantages of Email-Only Approach

1. **Simplicity**: Eliminates the complexity of browser automation
2. **Reliability**: Less prone to failures from UI changes or browser issues
3. **Performance**: Faster execution as it avoids browser startup and navigation
4. **Security**: Reduced attack surface by eliminating browser dependencies
5. **Maintenance**: Easier to maintain with fewer dependencies
6. **Resource Efficiency**: Lower CPU and memory requirements without browser automation
7. **Reduced Dependencies**: No need for Playwright, Chromium, or other browser automation libraries

## Workflow Integration

The email-only ingestion is integrated into the CRM workflow:

1. `src/workflows/email-crm-workflow.js` defines the complete workflow
2. The workflow orchestrates the entire process from ingestion to insight generation
3. Each step has proper error handling and logging

## Testing the Complete Workflow

You can test the complete email-only CRM workflow using:

```
node test-email-crm-workflow.js
```

This will execute all steps of the workflow and display the generated insights.

## Configuring Email Accounts for CRM Reports

To ensure reliable email ingestion, configure your CRM platforms to send reports to the email account specified in your environment variables. Some tips:

1. Set up email filters to organize CRM reports into specific folders
2. Configure consistent report delivery schedules
3. Use standardized report formats and naming conventions
4. Set up alerts for failed report deliveries

## Troubleshooting

Common issues and solutions:

1. **Authentication Failures**:
   - Verify email credentials are correct
   - For Gmail, enable "Less secure app access" or use app passwords
   - Check for account lockouts or security alerts

2. **No Reports Found**:
   - Verify reports are being sent to the correct email account
   - Check spam/junk folders
   - Confirm search criteria matches the actual email format

3. **Connection Issues**:
   - Verify IMAP settings (host, port, TLS)
   - Check network connectivity
   - Ensure firewall allows IMAP connections

4. **Attachment Processing Errors**:
   - Verify attachment format is supported
   - Check for corrupted attachments
   - Ensure sufficient disk space for downloads
