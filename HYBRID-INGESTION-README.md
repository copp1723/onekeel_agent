# Hybrid Ingestion for CRM Reports

This document explains the hybrid approach for ingesting CRM reports from various platforms like VinSolutions and VAUTO, with both email-based and browser-based automation strategies.

## Overview

The hybrid ingestion approach provides two methods for retrieving CRM reports:

1. **Email Ingestion**: Attempt to find and download reports from configured email accounts
2. **Browser Automation Fallback**: If email ingestion fails, fall back to browser automation to log in and download reports directly

This dual approach provides reliability and flexibility - if one method fails, the system automatically tries the other.

## Setup and Configuration

### Required Environment Variables

#### Email Ingestion
- `EMAIL_USER`: Email account username
- `EMAIL_PASS`: Email account password
- `EMAIL_HOST`: IMAP server hostname (e.g., `imap.gmail.com`)
- `EMAIL_PORT`: IMAP server port (optional, default: 993)
- `EMAIL_TLS`: Use TLS (optional, default: true)

#### Browser Automation
- For VinSolutions:
  - `VIN_SOLUTIONS_USERNAME`: VinSolutions login username
  - `VIN_SOLUTIONS_PASSWORD`: VinSolutions login password
  - `OTP_EMAIL_USER`: Email account for receiving OTP codes
  - `OTP_EMAIL_PASS`: Password for OTP email account

- For VAUTO:
  - `VAUTO_USERNAME`: VAUTO login username
  - `VAUTO_PASSWORD`: VAUTO login password

#### Download Settings
- `DOWNLOAD_DIR`: Directory for saving downloaded reports (default: `./downloads`)

### Platform Configuration

Platform-specific settings are stored in `configs/platforms.json`. This file defines:

- Login steps and selectors
- OTP handling requirements
- Navigation paths 
- Download selectors

Each platform has a structured configuration that enables the browser automation to work across different CRM systems.

## Implementation Components

### 1. Email OTP Retrieval (`src/utils/emailOTP.js`)

Provides functionality to:
- Connect to email accounts via IMAP
- Search for specific messages containing OTP codes
- Extract and return OTP codes using regular expressions

This is used for both email ingestion and for handling 2FA during browser automation.

### 2. Hybrid Ingestion Orchestrator (`src/agents/hybridIngestAndRunFlow.js`)

Coordinates the overall process:
- Attempts email ingestion first
- Falls back to browser automation if needed
- Handles errors and retries
- Returns the path to the downloaded report

### 3. Browser Automation (`src/agents/runFlow.js`)

Manages browser automation using Playwright:
- Launches a browser instance
- Navigates through login process
- Handles OTP/2FA challenges
- Downloads reports based on platform config
- Includes retry logic for resilience

## Testing

You can test the hybrid ingestion approach using:

```
node test-hybrid-ingestion-chromium.js VinSolutions
```

For testing without making actual API calls:

```
USE_SAMPLE_DATA=true node test-hybrid-ingestion-chromium.js VinSolutions
```

## Integration with CRM Analysis Flow

The hybrid ingestion module integrates with the CRM analysis pipeline:

1. Hybrid ingestion retrieves the report
2. Report is parsed and processed
3. Data is analyzed using the automotive analyst LLM system
4. Structured insights are generated

## Error Handling and Retries

The system implements sophisticated error handling:

- Network interruptions: Automatic retries with exponential backoff
- Authentication failures: Proper error messages and logging
- Browser issues: Recovery mechanisms and cleanup
- Timeouts: Configurable timeout settings for each operation

## Database Integration

Metadata about ingestion attempts is stored in the database:
- Success/failure status
- Timestamps
- Source (email or browser)
- Error messages if applicable
- File path of the downloaded report

This enables tracking and auditing of all ingestion activities.

## Security Considerations

- Credentials are stored securely and never logged
- OTP handling follows security best practices
- Browser sessions are properly terminated after use
- Downloaded reports are stored in a secure location