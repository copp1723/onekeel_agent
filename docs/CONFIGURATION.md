# Configuration Guide

This document provides detailed information about configuring the AgentFlow application, including environment variables, configuration files, and validation rules.

## Environment Variables

AgentFlow uses environment variables for configuration. These can be set in a `.env` file in the project root or directly in the environment.

### Required Environment Variables

These variables are required for the application to function properly:

| Variable | Description | Format | Default |
|----------|-------------|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host:port/dbname` | None |
| `EKO_API_KEY` | API key for Eko AI | String | None |
| `OPENAI_API_KEY` | API key for OpenAI | String | None |
| `EMAIL_USER` | Email account for sending notifications | String | None |
| `EMAIL_PASS` | Password for email account | String | None |
| `EMAIL_HOST` | SMTP server hostname | String | None |
| `OTP_EMAIL_USER` | Email account for OTP retrieval | String | None |
| `OTP_EMAIL_PASS` | Password for OTP email account | String | None |

### Optional Environment Variables

These variables are optional and have default values:

| Variable | Description | Format | Default |
|----------|-------------|--------|---------|
| `NODE_ENV` | Node environment | `development`, `production`, or `test` | `development` |
| `PORT` | Server port | Integer | `5000` |
| `LOG_LEVEL` | Logging level | `error`, `warn`, `info`, `debug`, or `trace` | `info` |
| `EMAIL_PORT` | SMTP server port | Integer | `587` |
| `DOWNLOAD_DIR` | Directory for downloaded reports | Path | `./downloads` |
| `OTP_PATTERN` | Regex pattern for OTP extraction | Regex string | `OTP is: (\\d{6})` |
| `OTP_SUBJECT` | Subject line for OTP emails | String | `Your OTP Code` |
| `HEALTH_CHECK_INTERVAL` | Health check interval in minutes | Integer | `15` |
| `ADMIN_EMAILS` | Comma-separated list of admin emails | String | None |

### Security-Related Environment Variables

These variables are related to security and have special validation rules:

| Variable | Description | Format | Default |
|----------|-------------|--------|---------|
| `ENCRYPTION_KEY` | Key for AES-256-GCM encryption | 32-byte (64 hex chars) string | `default-dev-key-should-change-in-production` (not secure for production) |
| `SECURITY_AUDIT_LEVEL` | Security audit logging level | `error`, `warn`, `info`, `debug` | `info` |
| `SENDGRID_API_KEY` | API key for SendGrid | String | None |

### CRM Platform Credentials

These variables are required for specific CRM platforms:

| Variable | Description | Format | Default |
|----------|-------------|--------|---------|
| `VIN_SOLUTIONS_USERNAME` | VinSolutions username | String | None |
| `VIN_SOLUTIONS_PASSWORD` | VinSolutions password | String | None |
| `VAUTO_USERNAME` | VAUTO username | String | None |
| `VAUTO_PASSWORD` | VAUTO password | String | None |

## Validation Rules

The application validates environment variables at startup using the `envValidator` utility. The validation rules include:

1. **Required Variables**: Checks that all required variables are set
2. **Default Values**: Warns if default values are used in production
3. **Format Validation**: Validates the format of certain variables
4. **Production Checks**: Applies stricter validation in production

### Validation Behavior

- In **development** mode, missing optional variables trigger warnings but allow startup
- In **production** mode, missing required variables or using default values for sensitive data causes the application to exit
- In **test** mode, default test values are used for most variables

## Configuration Files

In addition to environment variables, AgentFlow uses several configuration files:

### `configs/multi-vendor.json`

Configures vendor-specific email patterns and data extraction rules:

```json
{
  "vendors": {
    "VinSolutions": {
      "emailPatterns": {
        "fromAddresses": ["reports@vinsolutions.com"],
        "subjectPatterns": ["Daily Report"],
        "attachmentTypes": ["csv", "xlsx"]
      },
      "extractorConfig": {
        "type": "csv",
        "dateColumn": "Date",
        "keyColumns": ["Customer", "Vehicle"]
      }
    }
  }
}
```

### `configs/platforms.json`

Configures browser automation steps for each platform:

```json
{
  "VinSolutions": {
    "baseUrl": "https://crm.vinsolutions.com/login",
    "hasOTP": true,
    "loginSteps": [
      { "action": "goto", "args": ["https://crm.vinsolutions.com/login"] },
      { "action": "fill", "selector": "#username", "value": "{{VIN_SOLUTIONS_USERNAME}}" }
    ]
  }
}
```

## Setting Up Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to set your actual values:
   ```bash
   nano .env
   ```

3. For production, ensure all required variables are set and no default values are used for sensitive data.

4. Validate your configuration:
   ```bash
   npm run validate-env
   ```

## Configuration Best Practices

1. **Never commit sensitive values** to version control
2. **Use different values** for development, testing, and production
3. **Rotate API keys** periodically
4. **Use environment-specific validation** to catch configuration issues early
5. **Document all configuration changes** in your team's knowledge base

## Troubleshooting Configuration Issues

### Missing Environment Variables

If the application fails to start with an error about missing environment variables:

1. Check that all required variables are set in your `.env` file
2. Verify that the `.env` file is in the correct location (project root)
3. Try setting the variables directly in your shell:
   ```bash
   export DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   ```

### Default Values in Production

If the application exits with an error about default values in production:

1. Replace all default values with actual production values
2. Pay special attention to `ENCRYPTION_KEY` and API keys
3. Use a secure method to generate the encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Database Connection Issues

If the application fails to connect to the database:

1. Verify that the `DATABASE_URL` is correct
2. Check that the database server is running
3. Ensure that the database user has the necessary permissions
4. Test the connection manually:
   ```bash
   psql "postgresql://user:password@localhost:5432/dbname"
   ```
