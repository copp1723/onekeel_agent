# Task Scheduler for Automated Workflows

This document explains the scheduler functionality that enables automated workflow execution based on cron expressions.

## Features

- **Cron-based Scheduling**: Define schedules using standard cron expressions
- **Persistent Storage**: Schedules are stored in the database for persistence across restarts
- **Job Queue Integration**: Scheduled tasks are executed through the job queue system
- **API Endpoints**: RESTful API for managing schedules
- **Auto-restart**: Schedules are automatically restarted when the server starts

## Architecture

### Core Components

1. **Scheduler Service**: Manages schedule registration, execution, and lifecycle
2. **Node-cron**: Used for timing and executing cron expressions
3. **Job Queue**: Handles the execution and retries of scheduled workflow tasks
4. **API Endpoints**: For creating, listing, updating, and deleting schedules

### Database Schema

The schedules table stores all the schedule information:

```
schedules
├── id: string (UUID, primary key)
├── workflowId: string (reference to workflows table)
├── cron: string (cron expression, e.g., "*/5 * * * *")
├── lastRunAt: Date (timestamp of last execution)
├── enabled: boolean (whether the schedule is active)
├── createdAt: Date
└── updatedAt: Date
```

## Usage

### Creating a Schedule

```typescript
import { createSchedule } from './src/services/schedulerService';

// Run a workflow every day at 8:00 AM
const schedule = await createSchedule(
  'workflow-uuid-here',
  '0 8 * * *',
  true // enabled
);
```

### Listing Schedules

```typescript
import { listSchedules } from './src/services/schedulerService';

const schedules = await listSchedules();
console.log(schedules);
```

### Updating a Schedule

```typescript
import { updateSchedule } from './src/services/schedulerService';

// Update to run every 2 hours
const updatedSchedule = await updateSchedule('schedule-uuid-here', {
  cron: '0 */2 * * *',
  enabled: true
});
```

### Deleting a Schedule

```typescript
import { deleteSchedule } from './src/services/schedulerService';

const result = await deleteSchedule('schedule-uuid-here');
console.log(`Schedule deleted: ${result}`);
```

## API Endpoints

The scheduler exposes the following REST API endpoints:

- `POST /api/schedules` - Create a new schedule
- `GET /api/schedules` - List all schedules
- `GET /api/schedules/:id` - Get a schedule by ID
- `PATCH /api/schedules/:id` - Update a schedule
- `DELETE /api/schedules/:id` - Delete a schedule

All endpoints require authentication using the `isAuthenticated` middleware.

## Testing

You can test the scheduler functionality using the `test-scheduler.js` script:

```bash
node test-scheduler.js
```

This script creates a test workflow, schedules it, updates the schedule, and then cleans up.

## Implementation Details

### Initialization

When the server starts, the scheduler service:

1. Connects to the database
2. Loads all enabled schedules
3. Starts each schedule with node-cron
4. Registers them in the active schedules map

### Execution Flow

When a schedule triggers:

1. The scheduler updates the `lastRunAt` timestamp
2. Creates a task log entry with taskType 'scheduledWorkflow'
3. Enqueues the job in the job queue system
4. The job queue processor executes the workflow using `executeWorkflowById`
5. Updates the task status and result

### Error Handling

- Failed executions are logged and retried according to the job queue settings
- Schedules continue to run even if individual executions fail
- Detailed error information is stored in the task logs

## Common Cron Expressions

- `* * * * *` - Every minute
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour at minute 0
- `0 0 * * *` - Every day at midnight
- `0 8 * * 1-5` - Weekdays at 8:00 AM
- `0 0 * * 0` - Every Sunday at midnight