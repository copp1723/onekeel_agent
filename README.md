# AgentFlow - AI Agent Backend using Eko

A flexible AI agent backend using Fellou Eko that executes various tasks including web crawling, flight status checking, and dealer interactions. The agent accepts natural language input and returns structured data as JSON. It's specifically designed for automotive dealerships to analyze CRM reports, generate insights, and distribute them via email to different stakeholders.

## Features

### Core Features
- ✅ Accepts natural language tasks for multiple use cases
- ✅ Uses Eko as the agent runtime
- ✅ Implements a crawlWebsite tool that uses Firecrawl
- ✅ Stores API keys and credentials securely in Supabase
- ✅ Returns structured data in JSON format

### Extended Features (Phase 2)
- ✅ Multiple tools (crawlWebsite, checkFlightStatus)
- ✅ Secure credential storage with dealerCredentials
- ✅ LLM-powered task parsing and intent recognition
- ✅ REST API endpoint for task submission and tracking
- ✅ Task logging and status tracking
- ✅ Multi-step task execution (extract-then-summarize)

### Automotive Dealership Features
- ✅ CRM report ingestion via email-only approach (VinSolutions, VAUTO, DealerTrack)
- ✅ Complete data flow integration pipeline for attachment parsing, storage, and analysis
- ✅ Support for CSV, XLSX, and PDF file formats with validation
- ✅ Structured storage of results in filesystem and database
- ✅ AI-powered insight generation with metadata tracking
- ✅ Role-based insight distribution
- ✅ Scheduled report processing
- ✅ Email notifications
- ✅ OTP email verification for secure access

### Recent Fixes and Improvements
- ✅ Executed automated TypeScript error fixing script to address common TypeScript errors
- ✅ Fixed import path issues with double extensions (.js.js) and ellipsis imports ('...')
- ✅ Improved error handling with proper type guards for unknown error types
- ✅ Fixed Drizzle ORM type issues with proper SQL query typing
- ✅ Completed TypeScript conversion with strict type checking across the entire codebase
- ✅ Defined comprehensive type definitions for all data structures and interfaces
- ✅ Added proper type declarations for vendor configurations and database schemas
- ✅ Implemented type-safe error handling with custom error types and consistent patterns
- ✅ Fixed all TypeScript errors in core service files and utilities
- ✅ Enhanced tsconfig.json with strict compiler options for improved type safety
- ✅ Created utility functions for type-safe error handling and logging
- ✅ Added proper null checking and type guards throughout the codebase
- ✅ Implemented module declarations for JSON imports and external modules
- ✅ Removed any types and replaced with specific types
- ✅ Added TypeScript compilation check to CI pipeline
- ✅ Implemented distributed job queue with BullMQ and Redis for improved scalability and reliability
- ✅ Created queue definitions for ingestion, processing, email, and insight generation
- ✅ Implemented job producers with configurable options (attempts, backoff, priority)
- ✅ Added worker processes with concurrency and resource limits
- ✅ Updated orchestration to work within job queue context with progress tracking
- ✅ Implemented proper cleanup on job completion and error handling
- ✅ Added support for horizontal scaling with multiple workers
- ✅ Ensured job state persists across system restarts
- ✅ Implemented complete data flow integration pipeline with attachment parsers, results persistence, and insight generation
- ✅ Added support for CSV, XLSX, and PDF file formats with Zod validation
- ✅ Created structured storage system for parsed results in both filesystem and database
- ✅ Implemented deduplication logic to avoid reprocessing identical reports
- ✅ Enhanced insight generator to work with in-memory data objects
- ✅ Added metadata tracking for LLM responses and prompt versions
- ✅ Created comprehensive unit tests for all new components
- ✅ Implemented retry mechanisms with exponential backoff for all critical operations
- ✅ Added circuit breaker pattern to prevent cascading failures
- ✅ Enhanced system reliability for email operations, file parsing, and API calls
- ✅ Fixed workflowEmailService.js for proper email notifications
- ✅ Fixed taskParser.js export for correct task parsing
- ✅ Fixed emailOTP.js module for OTP verification
- ✅ Fixed schema.ts missing exports for database tables
- ✅ Enhanced emailOTP.ts with improved error handling and timeout support
- ✅ Fixed TypeScript errors in runFlow.ts
- ✅ Created comprehensive developer onboarding guide
- ✅ Set up Jest testing framework with initial tests
- ✅ Fixed service layer type errors in emailQueue.ts, healthService.ts, scheduler.ts, and schedulerServiceSimple.ts
- ✅ Enhanced email queue system with exponential backoff and retry functionality
- ✅ Created integration tests for task parsing, workflow execution, and email notifications
- ✅ Implemented rate limiting for API endpoints to prevent abuse
- ✅ Set up CI pipeline using GitHub Actions for automated testing
- ✅ Created email template system with HTML and plain text support
- ✅ Optimized database queries with caching and indexing
- ✅ Refactored ingestion orchestration to email-only approach with improved error handling
- ✅ Removed browser automation dependencies (Playwright/Chromium)
- ✅ Updated documentation to reflect email-only approach
- ✅ Updated tests to use email-only ingestion
- ✅ Enhanced security with AES-GCM encryption for sensitive data
- ✅ Added environment variable validation to prevent startup with default secrets in production
- ✅ Implemented per-user credential isolation with user_credentials table
- ✅ Added security audit logging for credential operations and security events
- ✅ Created CI checks for default secret strings to prevent committing insecure defaults

## Prerequisites

- Node.js and npm installed
- Supabase account with a project set up
- Eko API key from [Fellou Eko](https://eko.fellou.ai/)
- Firecrawl API key for web crawling

## Setup

1. Clone this repository:

```
git clone https://github.com/yourusername/ai-agent-backend.git
cd ai-agent-backend
```

2. Install dependencies:

```
npm install
```

3. Configure environment variables:

   - Copy `.env.example` to `.env`
   - Update with your actual API keys and Supabase connection string

   **Important API Key Information:**
   - `EKO_API_KEY`: Required for the AI agent to function. This should be a valid OpenAI API key that can access models like `gpt-4o-mini`.
   - `DATABASE_URL`: Required for storing and retrieving credentials.
   - Firecrawl API key: This should be added to the database using the provided utility script.

   **Environment Variables:**

   Required:
   - `DATABASE_URL`: PostgreSQL connection string
   - `EMAIL_USER`: Email account for notifications and report ingestion
   - `EMAIL_PASS`: Password for email account
   - `EMAIL_HOST`: IMAP/SMTP server for email operations
   - `EMAIL_PORT`: SMTP port (default: 587)
   - `API_KEY`: Secret key for API authentication
   - `ENCRYPTION_KEY`: Secret key for encrypting sensitive data (required in production)

   Optional:
   - `LOG_LEVEL`: Logging level (default: 'info')
   - `PORT`: Server port (default: 3000)
   - `NODE_ENV`: Environment (development/production)
   - `DOWNLOAD_DIR`: Directory for downloaded reports
   - `EMAIL_PORT_IMAP`: IMAP port (default: 993)
   - `EMAIL_TLS`: Use TLS for IMAP (default: true)
   - `USE_SAMPLE_DATA`: Use sample data for testing (true/false)

   Redis Configuration (for BullMQ):
   - `REDIS_HOST`: Redis server hostname (default: 'localhost')
   - `REDIS_PORT`: Redis server port (default: 6379)
   - `REDIS_PASSWORD`: Redis server password (if required)
   - `FORCE_IN_MEMORY_QUEUE`: Set to 'true' to force in-memory queue mode (for development)
   - `WORKER_CONCURRENCY`: Number of concurrent jobs per worker (default: 5)
   - `INGESTION_WORKER_CONCURRENCY`: Number of concurrent ingestion jobs (default: 3)
   - `PROCESSING_WORKER_CONCURRENCY`: Number of concurrent processing jobs (default: 2)

   Security-related:
   - `ENCRYPTION_KEY`: 32-byte (64 hex chars) key for AES-256-GCM encryption
   - `SECURITY_AUDIT_LEVEL`: Level of security audit logging (default: 'info')
   - `DISABLE_DEFAULT_SECRETS_CHECK`: Set to 'true' to disable default secrets check in development (not recommended)

4. Set up the Supabase database:

   - Make sure your Supabase project is created
   - The database table will be created automatically when you first run the application
   - Add your Firecrawl API key to the database using the provided script:

```bash
# From the command line:
npm run setup-key YOUR_FIRECRAWL_API_KEY

# Or manually through SQL in the Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY NOT NULL,
  key_name VARCHAR(255) NOT NULL UNIQUE,
  key_value TEXT NOT NULL
);

-- Insert your Firecrawl API key
INSERT INTO api_keys (id, key_name, key_value)
VALUES ('1', 'firecrawl', 'your_firecrawl_api_key_here');
```

5. Build and run the project:

```bash
# Build and run the main agent
npm run build
npm start

# Or run the API server (Phase 2)
npm run build
node dist/api/server.js
```

6. To start the API server (Phase 2 feature):

```bash
# Start the API server on port 5000
node dist/api/server.js
```

You can then submit tasks to the API:

```bash
# Submit a web crawling task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"task": "Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts"}'

# Check task status
curl http://localhost:5000/api/tasks/{task_id}

# List all tasks
curl http://localhost:5000/api/tasks
```

### Simplified Server (No Database Dependencies)

A simplified version of the server is also available that doesn't require any database connections:

```bash
# Run the simplified server
node dist/index.js
```

This version provides all the same API endpoints but stores data in memory instead of a database.

## Usage

### Basic Usage (Phase 1)
The application takes a natural language task description and uses it to crawl websites. By default, it crawls Hacker News to extract data from the top posts, but you can modify the task in `src/index.ts` to crawl any website.

Example task:

```
"Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts"
```

### Extended Usage (Phase 2)
With the Phase 2 extensions, the agent supports multiple tools and task types:

1. **Web Crawling Tasks**:
   ```
   "Crawl https://example.com and extract all product information"
   ```

2. **Web Content Extraction**:
   ```
   "Extract clean content from https://example.com"
   "Get the article text from https://news.example.com/article"
   ```

3. **Flight Status Checks**:
   ```
   "Check the status of flight UA123 for today"
   ```

4. **Dealer Credential Management**:
   ```
   "Login to the dealer portal for dealer ABC123"
   ```

5. **Multi-Step Tasks** (New):
   ```
   "Summarize the content from https://example.com"
   ```
   This will automatically:
   - Extract clean content from the URL
   - Summarize the extracted content using property path access

   The multi-step execution engine supports:
   - Sequential execution of multiple tools
   - Passing outputs between steps with template variables
   - Advanced property path access with syntax like `{{step0.output.content}}`
   - Automatic type handling for object and primitive values

The agent will automatically parse the task intent using either rule-based or LLM-powered parsing, select the appropriate tool, and execute the task. For multi-step tasks, the agent will create and execute a plan with multiple steps in sequence.

### API Usage

You can also use the REST API to submit tasks and retrieve results. Start the API server and use the following endpoints:

#### Asynchronous API (v1)
- `POST /api/tasks` - Submit a new task (returns immediately with a task ID)
- `GET /api/tasks/:taskId` - Get a specific task's status and results
- `GET /api/tasks` - List all tasks

#### Direct Task Execution API (v2)
- `POST /submit-task` - Submit a task and wait for completion (returns the result or error)

#### Multi-Step Demo API (v3)
- `POST http://localhost:3000/summarize` - Extract and summarize content from a URL
  - Request body: `{ "url": "https://example.com" }`
  - Returns: Clean extracted content and its summary with statistics
- `GET http://localhost:3000/health` - Health check endpoint

#### Rate Limiting

All API endpoints are protected by rate limiting to prevent abuse:

- Global rate limit: 100 requests per 15 minutes per IP address
- Task submission endpoints (`/api/tasks` and `/submit-task`): 10 requests per minute
- Authentication endpoints: 5 requests per minute
- Health check endpoint: 30 requests per minute

When a rate limit is exceeded, the API returns a `429 Too Many Requests` response with information about when the limit will reset. The response includes the following headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining
- `X-RateLimit-Reset`: Time (in seconds) until the rate limit resets
- `Retry-After`: Time (in seconds) to wait before making another request

Example POST request to /submit-task:

```bash
curl -X POST http://localhost:5000/submit-task \
  -H "Content-Type: application/json" \
  -d '{"task": "Crawl https://example.com and summarize"}'
```

Example response:

```json
{
  "success": true,
  "result": {
    "summary": "Example.com is a domain used for illustrative examples in documents...",
    "links": [
      "https://www.iana.org/domains/example"
    ]
  }
}
```

Example POST request to the multi-step summarize endpoint:

```bash
curl -X POST http://localhost:3000/summarize \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Example response:

```json
{
  "success": true,
  "result": {
    "url": "https://example.com",
    "originalContent": "This domain is for use in illustrative examples in documents...",
    "summary": "This domain is used for illustrative examples in documentation...",
    "stats": {
      "originalLength": 172,
      "summaryLength": 146,
      "compressionRatio": "85%"
    },
    "steps": [
      {"name": "extract", "status": "success"},
      {"name": "summarize", "status": "success"}
    ]
  }
}
```

All task executions are logged to the database with the following information:
- User input (original task)
- Tool used for execution
- Status (success/error)
- Output or error details

## Project Structure

### Core Components (Phase 1)
- `src/index.ts` - Main entry point
- `src/tools/crawlWebsite.ts` - Web crawling tool using Firecrawl
- `src/services/supabase.ts` - Service for interacting with Supabase
- `src/shared/schema.ts` - Database schema definitions
- `src/scripts/setup-db.ts` - Database setup script

### Extended Components (Phase 2)
- `src/tools/checkFlightStatus.ts` - Flight status checking tool
- `src/tools/extractCleanContent.ts` - Clean content extraction using trafilatura
- `src/tools/summarizeText.ts` - Text summarization using LLM
- `src/services/taskParser.ts` - Task parsing and intent recognition
- `src/api/server.ts` - REST API for task submission and management
- `src/scripts/insert-firecrawl-key.ts` - Utility to add Firecrawl API key
- `src/agent/executePlan.ts` - Multi-step execution engine
- `src/summaryExtractor.js` - Extract and summarize workflow
- `src/multistep-demo.js` - Dedicated multi-step demo endpoint

### Logging & Database Components (Phase 3)
- `src/shared/db.ts` - Database connection and Drizzle ORM setup
- `src/shared/logger.ts` - Task logging utilities for DB persistence
- `/submit-task` endpoint - Direct task execution with immediate response
- `dist/index.js` - Simplified server with no database dependencies

### Error Handling & Testing Components (Phase 4)
- `src/shared/errorTypes.ts` - Custom error types for consistent error handling
- `src/shared/errorHandler.ts` - Error handling utilities and middleware
- `src/docs/ERROR_HANDLING.md` - Documentation for error handling patterns
- `src/__tests__/integration/` - Integration tests for key workflows
- `src/services/__tests__/` - Unit tests for service layer components

### Security & CI Components (Phase 5)
- `src/shared/middleware/rateLimiter.ts` - Rate limiting middleware for API protection
- `src/docs/RATE_LIMITING.md` - Documentation for rate limiting configuration
- `.github/workflows/ci.yml` - GitHub Actions CI pipeline configuration
- `src/docs/CI_PROCESS.md` - Documentation for CI process
- `src/utils/encryption.ts` - Enhanced AES-GCM encryption for sensitive data
- `src/utils/envValidator.ts` - Environment variable validation for secure startup
- `src/services/userCredentialService.ts` - Per-user credential isolation service
- `src/shared/schema.ts` - Security audit logs and user credentials tables
- `ci/check-secrets.js` - CI check for default secrets in codebase

### Email & Database Optimization Components (Phase 6)
- `src/services/emailTemplateEngine.ts` - Email template rendering engine
- `src/services/emailTemplateService.ts` - Service for sending templated emails
- `src/services/emailTemplates/` - HTML and plain text email templates
- `src/docs/EMAIL_TEMPLATES.md` - Documentation for email template system
- `src/services/dbOptimizationService.ts` - Database optimization utilities
- `src/services/queryOptimizer.ts` - Optimized database query patterns
- `src/scripts/optimize-database.ts` - Script to add indexes and optimize tables
- `src/scripts/test-query-performance.ts` - Script to test query performance
- `src/docs/DATABASE_OPTIMIZATION.md` - Documentation for database optimization

### Data Flow Integration Pipeline Components (Phase 7)
- `src/services/attachmentParsers.ts` - Parsers for CSV, XLSX, and PDF files with validation
- `src/services/resultsPersistence.ts` - Storage of parsed results in filesystem and database
- `src/services/insightGenerator.ts` - Generation of insights from parsed data
- `src/agents/emailIngestAndRunFlow.ts` - End-to-end orchestration of the data flow
- `test-data-flow.js` - Test script for the complete data flow
- `src/__tests__/services/attachmentParsers.test.ts` - Unit tests for attachment parsers
- `src/__tests__/services/resultsPersistence.test.ts` - Unit tests for results persistence
- `src/__tests__/services/insightGenerator.test.ts` - Unit tests for insight generator
- `src/__tests__/agents/emailIngestAndRunFlow.test.ts` - Unit tests for orchestration flow

### Distributed Job Queue Components (Phase 8)
- `src/services/bullmqService.ts` - Core BullMQ implementation with Redis
- `src/services/queueManager.ts` - Queue management and configuration
- `src/services/distributedScheduler.ts` - Distributed scheduler using BullMQ
- `src/services/jobQueueSystem.ts` - Main entry point for job queue system
- `src/workers/ingestionWorker.ts` - Worker for ingestion jobs
- `src/workers/processingWorker.ts` - Worker for processing jobs
- `test-job-queue.js` - Test script for the job queue system

### Database Schemas
- `api_keys` - Secure storage for API keys
- `dealer_credentials` - Secure storage for dealer login credentials
- `task_logs` - Persistent storage for task execution history and results
- `report_sources` - Tracks where reports come from (email, manual upload, API, etc.)
- `reports` - Stores processed report data and metadata
- `insights` - Stores generated insights from report analysis
- `insight_distributions` - Tracks distribution of insights to recipients
- `historical_metrics` - Stores time-series data for trend analysis and reporting
- `report_processing_jobs` - Tracks the status of report processing jobs for retries and monitoring
- `security_audit_logs` - Tracks security-related events for audit and compliance
- `user_credentials` - Secure per-user credential storage with enhanced encryption

## Technologies Used

- [Eko AI](https://eko.fellou.ai/) - AI agent framework
- [Firecrawl](https://firecrawl.dev/) - Web scraping API
- [Supabase](https://supabase.com/) - Database for storing API keys
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [BullMQ](https://docs.bullmq.io/) - Distributed job queue with Redis
- [Redis](https://redis.io/) - In-memory data store for job queue
- [imap-simple](https://www.npmjs.com/package/imap-simple) - Email-only CRM report ingestion and OTP verification
- [SendGrid](https://sendgrid.com/) - Email notifications
- [Express](https://expressjs.com/) - Web server framework
- [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit) - API rate limiting
- [Vitest](https://vitest.dev/) - Testing framework for unit and integration tests
- [Nodemailer](https://nodemailer.com/) - Email sending library with retry capabilities
- [Node Cache](https://www.npmjs.com/package/node-cache) - In-memory caching for database queries
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [csv-parse](https://www.npmjs.com/package/csv-parse) - CSV parsing library
- [ExcelJS](https://www.npmjs.com/package/exceljs) - Excel file parsing library
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF parsing library
- [OpenAI](https://www.npmjs.com/package/openai) - OpenAI API client for insight generation
- [Jest](https://jestjs.io/) - Testing framework for unit and integration tests
- [Retry Pattern](src/docs/RETRY_AND_CIRCUIT_BREAKER.md) - Custom implementation of retry with exponential backoff
- [Circuit Breaker Pattern](src/docs/RETRY_AND_CIRCUIT_BREAKER.md) - Custom implementation of the circuit breaker pattern

## Extending the Project

To add more tools or capabilities:

1. Create a new tool in `src/tools/`
2. Update `src/index.ts` to register the tool with Eko
3. Update your natural language task to utilize the new tool

## TypeScript Development

The project uses strict TypeScript settings for improved type safety and code quality. To ensure your code compiles correctly:

1. Run the TypeScript compiler to check for errors:
   ```bash
   npm run check-types
   ```

2. If you encounter TypeScript errors, you can use the automated fixing script:
   ```bash
   node scripts/fix-typescript-errors.js
   ```

3. The script addresses common TypeScript issues:
   - Import path errors (adding .js extensions to relative imports)
   - Type mismatch errors (fixing common type issues)
   - Unknown type errors (proper error handling with type guards)
   - Property missing errors (fixing Drizzle ORM issues)
   - Unused import errors (removing unused imports)

4. Always add proper type definitions for new code in `src/types.ts`

## Deployment Instructions

### Local Deployment

1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. For the frontend (in a separate terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Git Repository Setup

1. Initialize Git repository (if not already done):
   ```bash
   ./fresh-git-push.sh
   ```

2. Or use the standard Git commands:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/agentflow.git
   git push -u origin main
   ```

### Continuous Integration (CI)

The project uses GitHub Actions for continuous integration. The CI pipeline automatically runs on every push to the main branch and on pull requests.

The CI pipeline performs the following checks:

1. **Lint**: Checks code formatting and TypeScript compilation
2. **Test**: Runs unit and integration tests
3. **Build**: Builds the application

To view the CI configuration, see `.github/workflows/ci.yml`. For more information about the CI process, see `src/docs/CI_PROCESS.md`.

To run the CI checks locally:

```bash
# Check code formatting
npx eslint . --ext .js,.jsx,.ts,.tsx

# Check TypeScript compilation
npm run check-types

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Build the application
npm run build
```

### Production Deployment

1. Set up environment variables on your production server
2. Clone the repository on your production server
3. Install dependencies: `npm install`
4. Build the application: `npm run build`
5. Use a process manager like PM2 to run the application:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "agentflow"
   ```

### Database Setup

1. Create a Supabase account and project
2. Set up the required tables using the SQL scripts in the repository
3. Update the .env file with your Supabase credentials

### Troubleshooting Deployment

If you encounter issues during deployment:

1. Check the TypeScript compilation errors:
   ```bash
   npx tsc --noEmit
   ```

2. Verify database connection:
   ```bash
   node dist/scripts/setup-db.js
   ```

3. Check the logs for any runtime errors:
   ```bash
   tail -f logs/insight_runs.log
   ```

## License

MIT