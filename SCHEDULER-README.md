# Task Scheduler for Automated Workflows

The Task Scheduler enables automated execution of workflows on a recurring schedule. This document describes the implementation and fixes applied to resolve the "Invalid time value" errors encountered with node-cron.

## Overview

The scheduler system provides the following functionality:

1. Create schedules that run workflows at specified intervals
2. Enable/disable existing schedules
3. Update schedule configurations
4. List and manage existing schedules
5. Automatic execution of workflows based on schedules

## Implementation Details

The scheduler has been implemented in two versions:

1. **Original Implementation** (schedulerService.js):
   - Uses node-cron for schedule management
   - Encountered "Invalid time value" errors in certain environments

2. **Fixed Implementation** (schedulerServiceSimple.js):
   - Uses native JavaScript setInterval instead of node-cron
   - More reliable interval-based scheduling
   - Simplified cron expression parsing
   - Fixes the "Invalid time value" errors

## Fixed Implementation

The simplified scheduler implementation provides the following advantages:

- Avoids the environment-specific issues with node-cron
- Uses native JavaScript timers (setInterval) for more reliable scheduling
- Stores active timers in a Map for proper resource management
- Provides the same API surface as the original implementation
- More robust error handling and logging

## Usage Example

```javascript
// Import the scheduler service
import * as scheduler from './services/fixed-schedulerService.js';

// Initialize the scheduler (loads enabled schedules from database)
await scheduler.initializeScheduler();

// Create a new schedule
const schedule = await scheduler.createSchedule(
  'workflow-123',   // Workflow ID
  '*/10 * * * *',   // Every 10 minutes (cron expression)
  {
    description: 'Process data every 10 minutes',
    enabled: true
  }
);

// Update a schedule
await scheduler.updateSchedule(schedule.id, {
  cronExpression: '0 * * * *',  // Every hour at minute 0
  enabled: true
});

// Get a schedule by ID
const retrievedSchedule = await scheduler.getSchedule(schedule.id);

// List all schedules
const allSchedules = await scheduler.listSchedules();

// Delete a schedule
await scheduler.deleteSchedule(schedule.id);
```

## Supported Cron Expressions

The simplified scheduler supports the following cron expression patterns:

- `*/n * * * *` - Every n minutes
- `n * * * *` - Every hour at minute n
- `m h * * *` - Every day at hour h and minute m

## Error Handling

The fixed implementation provides improved error handling:

- Better logging of scheduling errors
- Graceful handling of parsing failures
- Safe cleanup of timer resources
- Descriptive error messages

## Migration Notes

To switch to the fixed scheduler implementation:

1. Use the provided `fix-invalid-schedules.js` script to identify and disable problematic schedules
2. Import from `fixed-schedulerService.js` instead of `schedulerService.js`
3. Update any code that creates or manages schedules to use the new implementation

## Testing

The fixed scheduler implementation has been thoroughly tested with:

- `test-scheduler-simple.js` - Tests core functionality
- `test-fixed-scheduler.js` - Tests integration with the main system
- `test-scheduler-with-fixed-implementation.js` - Full replacement test

## Implementation Files

- `schedulerServiceSimple.ts` - TypeScript source for the fixed implementation
- `dist/services/schedulerServiceSimple.js` - Compiled JavaScript version 
- `dist/services/fixed-schedulerService.js` - Export wrapper for integration