# IMAP Hardening Implementation

This document describes the enhanced IMAP ingestion system with improved reliability, dynamic configuration, and monitoring capabilities.

## Overview

The IMAP hardening implementation provides a robust and resilient email ingestion system with the following features:

- Dynamic filter configuration from database
- Batched message fetching with pagination
- Multiple attachment processing with deduplication
- Reconnection logic with exponential backoff and circuit breaker
- Health check monitoring with alerts
- Rate limiting and backpressure handling
- Advanced error recovery with failed email archiving

## Components

### 1. Database Schema

The system uses two main database tables:

#### IMAP Filters Table

```sql
CREATE TABLE imap_filters (
    id SERIAL PRIMARY KEY,
    vendor VARCHAR(100) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    subject_regex TEXT NOT NULL,
    days_back INTEGER NOT NULL DEFAULT 7,
    file_pattern TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

#### Failed Emails Table

```sql
CREATE TABLE failed_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor VARCHAR(100) NOT NULL,
    message_id VARCHAR(255),
    subject TEXT,
    from_address VARCHAR(255),
    received_date TIMESTAMP WITH TIME ZONE,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'failed',
    raw_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### 2. IMAP Ingestion Service

The core service (`src/services/imapIngestionService.ts`) handles:

- Connecting to the IMAP server
- Searching for emails based on configured criteria
- Downloading and saving attachments
- Error handling with retries and circuit breaker
- Health check monitoring
- Rate limiting and backpressure handling
- Failed email archiving

### 3. Health Check System

The health check system (`src/services/healthCheckScheduler.ts`) monitors the IMAP connection:

- Periodic health checks (every 5 minutes)
- Status tracking in the database
- Admin alerts for connection failures
- Extended downtime detection (>15 minutes)
- Alert throttling to prevent notification spam

### 4. Admin API

The admin API (`src/routes/admin/imapFilters.ts`) provides endpoints for managing IMAP filters:

- GET /api/admin/imap-filters - List all filters
- GET /api/admin/imap-filters/:id - Get a specific filter
- POST /api/admin/imap-filters - Create a new filter
- PUT /api/admin/imap-filters/:id - Update a filter
- DELETE /api/admin/imap-filters/:id - Delete a filter
- POST /api/admin/imap-filters/:id/toggle - Toggle filter active status

## Configuration

### Environment Variables

The following environment variables are required:

- `EMAIL_USER`: Email account username
- `EMAIL_PASS`: Email account password
- `EMAIL_HOST`: IMAP server hostname
- `EMAIL_PORT`: IMAP server port (default: 993)
- `EMAIL_TLS`: Use TLS (default: true)
- `ADMIN_EMAILS`: Comma-separated list of admin email addresses for alerts

## Usage

### Running Migrations

To set up the database tables:

```bash
npm run migrate:imap-filters
npm run migrate:failed-emails
```

### Starting Health Checks

To start the health check scheduler:

```bash
npm run start:health-checks
```

### Running a Manual Health Check

To run a manual health check:

```bash
npm run health-check:imap
```

## Implementation Details

### Rate Limiting

The system implements rate limiting to prevent overwhelming the IMAP server:

- Maximum 100 IMAP operations per minute
- Configurable wait time for rate-limited operations
- Backpressure handling based on email queue size

### Batch Processing

Emails are processed in batches of 20 messages at a time to improve performance and reliability:

- Configurable batch size
- Proper "mark as seen" after successful processing
- Support for multiple attachments per email with deduplication

### Reconnection Logic

The system implements robust reconnection logic:

- Exponential backoff retry (5 attempts, max 60s delay)
- Circuit breaker pattern to prevent overwhelming IMAP server
- Detailed connection error logging

### Error Recovery

The system includes advanced error recovery mechanisms:

- Failed emails are archived in the database
- Retry queue for failed messages with configurable retry limits
- Detailed error tracking for debugging

## Monitoring

The system includes comprehensive monitoring:

- Health checks recorded in the database
- Alerts for connection failures
- Extended downtime detection (>15 minutes)
- Metrics for ingestion latency and error rates

## Best Practices

1. Set up email filters to organize CRM reports into specific folders
2. Configure consistent report delivery schedules
3. Use standardized report formats and naming conventions
4. Set up alerts for failed report deliveries
5. Regularly review the failed_emails table for recurring issues
