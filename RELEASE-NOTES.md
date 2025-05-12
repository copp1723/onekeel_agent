# Insight Engine Stability & Quality Upgrade Release Notes

## Overview

This release adds comprehensive stability, observability, and quality tracking to the Insight Engine system. These features provide a solid foundation for production deployment, future enhancements, and ongoing quality improvement.

## Key Features

### 1. Prompt Version Tracking

- Implemented semantic versioning (MAJOR.MINOR.PATCH) for all prompts
- Created centralized prompt router with version information
- Each prompt now exports its own version string

### 2. Insight Run Metadata Logging

- Added comprehensive logging system for insight generation runs
- Each run logs platform, prompt details, execution time, and results
- All runs are recorded in `logs/insight_runs.log` for easy monitoring

### 3. Output Snapshotting

- Every generated insight is saved to a structured directory:
  ```
  /results/{platform}/{date}/{filename}.json
  ```
- Snapshots include full metadata and timestamp information
- Enables tracking of insight changes over time and prompt comparisons

### 4. Quality Scoring (Optional)

- Added LLM-based insight quality evaluation system
- Scores insights on specificity, actionability, and clarity
- Provides detailed feedback with strengths and weaknesses

## How to Use

### Running Tests

```bash
# Basic stability test (no API calls)
node test-insight-engine-stability.cjs

# Full test with real CSV data
node test-crm-fetch-and-analyze-with-logging.js VinSolutions 12345 ./path/to/sample.csv

# Run smoke tests on a directory of CSV files
node scripts/run-smoke-tests.js ./test-data

# Analyze results and metrics
node scripts/analyze-results.js
```

### CI/CD Integration

A GitHub Actions workflow has been added in `.github/workflows/test-insight-engine.yml` that:
- Runs on changes to related source code
- Performs TypeScript compilation
- Executes stability tests
- Archives logs and results as artifacts

### Expected Outputs

After running insight generation, you'll have:

1. Log entries in `logs/insight_runs.log` with detailed run information
2. Generated insights stored in `/results/{platform}/{date}/` directories
3. (Optional) Quality scores for generated insights

## File Structure

```
├── logs/
│   └── insight_runs.log         # All insight generation runs and errors
├── results/
│   └── {platform}/             # E.g., VinSolutions, VAUTO
│       └── {date}/             # YYYY-MM-DD format
│           └── insight_*.json  # Generated insights with metadata
├── scripts/
│   ├── run-smoke-tests.js      # Batch testing against CSV files
│   └── analyze-results.js      # Results analysis and metrics
├── src/
│   ├── agents/
│   │   ├── generateInsightsFromCSV.ts  # Enhanced with stability features
│   │   └── insightScorer.ts            # Quality evaluation system
│   ├── prompts/
│   │   ├── automotiveAnalystPrompt.ts  # Now with version tracking
│   │   └── promptRouter.ts             # Central prompt selection with versioning
│   └── shared/
│       ├── logger.ts           # Comprehensive logging system
│       └── outputStorage.ts    # Structured output storage
├── test-insight-engine-stability.cjs               # Basic stability test
└── test-crm-fetch-and-analyze-with-logging.js      # End-to-end test
```

## Monitoring and Maintenance

- Monitor log size growth over time - consider log rotation for production
- Review quality scores to identify areas for prompt improvement
- Analyze performance metrics to detect bottlenecks

# Task Scheduler for Automated Workflows

## Overview

This release adds a powerful task scheduler system that enables automated execution of workflows based on cron expressions. This feature provides the foundation for automating recurring tasks such as data extraction, report generation, and insight analysis.

## Key Features

### 1. Cron-based Scheduling

- Schedule workflows using standard cron expressions
- Flexible timing options (minutely, hourly, daily, weekly, etc.)
- Persistent storage of schedules in the database

### 2. Job Queue Integration

- Integration with the job queue for reliable execution
- Automatic retries for failed scheduled tasks
- Prioritization of scheduled workflows

### 3. API Management

- Complete RESTful API for schedule management
- Authentication-protected endpoints
- Full CRUD operations for schedules

### 4. Schedule Lifecycle Management

- Schedule enabling/disabling
- Execution tracking and logging
- Automatic restart on server initialization

## How to Use

### Creating a Schedule

```typescript
// Run a workflow every day at 8:00 AM
const schedule = await createSchedule(
  'workflow-uuid-here',
  '0 8 * * *',
  true // enabled
);
```

### API Endpoints

- `POST /api/schedules` - Create a new schedule
- `GET /api/schedules` - List all schedules
- `GET /api/schedules/:id` - Get a schedule by ID
- `PATCH /api/schedules/:id` - Update a schedule
- `DELETE /api/schedules/:id` - Delete a schedule

### Testing

Use the `test-scheduler.js` script to verify scheduler functionality:

```bash
node test-scheduler.js
```

## File Structure

```
├── src/
│   ├── services/
│   │   ├── schedulerService.ts    # Core scheduler implementation
│   │   ├── workflowService.ts     # Workflow execution engine
│   │   └── jobQueue.ts            # Job queue with scheduler integration
│   ├── server/
│   │   └── routes/
│   │       └── schedules.ts       # API endpoints for schedule management
│   └── shared/
│       └── schema.ts              # Database schema including schedules table
├── test-scheduler.js              # Test script for scheduler functionality
└── SCHEDULER-README.md            # Detailed documentation
```

## Future Directions

This upgrade builds a foundation for:

1. A/B testing different prompt versions
2. Longitudinal analysis of insight quality over time
3. Advanced scheduling with dependencies and conditions
4. Multi-agent orchestration with reliability guarantees
5. Event-based triggering in addition to time-based scheduling