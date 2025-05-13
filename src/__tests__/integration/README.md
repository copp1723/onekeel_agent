# Integration Tests

This directory contains integration tests for the AgentFlow application. These tests verify that different components of the system work together correctly.

## Test Categories

1. **Task Parser Tests** - Tests for the natural language task parsing functionality
2. **Workflow Execution Tests** - Tests for the workflow execution engine
3. **Email Notification Tests** - Tests for the email notification system

## Running the Tests

To run all integration tests:

```bash
npm run test:integration
```

To run a specific test file:

```bash
npm run test:integration -- src/__tests__/integration/taskParser.spec.ts
```

## Test Environment

The integration tests use a test database that is separate from the development and production databases. The test database is configured in the `.env.test` file.

Before running the tests, make sure you have:

1. Set up the test database
2. Created the necessary tables using the schema migrations
3. Set the `NODE_ENV=test` environment variable

## Writing New Integration Tests

When writing new integration tests:

1. Create a new file in the `src/__tests__/integration` directory
2. Use the naming convention `*.spec.ts` for test files
3. Import the necessary dependencies and modules
4. Set up test data in the `beforeAll` hook
5. Clean up test data in the `afterAll` hook
6. Group related tests using `describe` blocks
7. Write individual test cases using `it` blocks
8. Use assertions to verify expected behavior

Example:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../shared/db.js';
import { someTable } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { functionToTest } from '../../services/someService.js';

describe('Some Feature Integration Tests', () => {
  // Test data
  const testId = 'test-id';
  
  // Set up test data
  beforeAll(async () => {
    await db.insert(someTable).values({
      id: testId,
      name: 'Test Name',
      // ...other fields
    });
  });
  
  // Clean up test data
  afterAll(async () => {
    await db.delete(someTable).where(eq(someTable.id, testId));
  });

  describe('Some Functionality', () => {
    it('should do something correctly', async () => {
      const result = await functionToTest(testId);
      
      expect(result).toBeDefined();
      expect(result.someProperty).toBe('expected value');
      // ...other assertions
    });
  });
});
```

## Mocking External Dependencies

For integration tests, we want to test how our components work together, but we may want to mock external services like email providers or third-party APIs.

Use the `vi.mock()` function to mock external dependencies:

```typescript
import { vi } from 'vitest';

// Mock the email service
vi.mock('../../services/mailerService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
}));
```

## Troubleshooting

If you encounter issues with the integration tests:

1. Check that your test database is properly configured
2. Verify that all necessary tables exist in the test database
3. Make sure you're cleaning up test data properly
4. Check for any environment-specific code that might behave differently in the test environment
5. Look for race conditions or timing issues in asynchronous tests
