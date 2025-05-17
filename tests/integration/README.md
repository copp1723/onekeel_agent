# AgentFlow Tests

This directory contains tests for the AgentFlow application.

## Test Structure

Tests are organized to mirror the source code structure:

```
__tests__/
├── agents/           # Tests for agent functionality
├── api/              # Tests for API endpoints
├── services/         # Tests for services
├── shared/           # Tests for shared utilities
└── utils/            # Tests for utility functions
```

## Running Tests

To run all tests:

```bash
npm test
```

To run tests with watch mode (for development):

```bash
npm run test:watch
```

To generate a coverage report:

```bash
npm run test:coverage
```

## Writing Tests

### Test File Naming

Test files should be named with the `.test.ts` or `.spec.ts` extension:

- `filename.test.ts` - For unit tests
- `filename.spec.ts` - For integration tests

### Test Structure

Each test file should follow this structure:

```typescript
import { functionToTest } from '../../src/src/../path/to/module';

// Optional: Mock dependencies
jest.mock('dependency', () => ({
  someFunction: jest.fn(),
}));

describe('Module or Function Name', () => {
  // Optional: Setup before tests
  beforeEach(() => {
    // Setup code
  });

  // Optional: Cleanup after tests
  afterEach(() => {
    // Cleanup code
  });

  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe(expectedOutput);
    });
    
    // More test cases...
  });
});
```

### Mocking

For mocking external dependencies, use Jest's mocking capabilities:

```typescript
// Mock a module
jest.mock('module-name');

// Mock a specific function
jest.spyOn(object, 'method').mockImplementation(() => mockReturnValue);

// Mock a function with different return values for each call
const mockFn = jest.fn()
  .mockReturnValueOnce(value1)
  .mockReturnValueOnce(value2);
```

### Testing Async Code

For testing asynchronous code:

```typescript
it('should handle async operations', async () => {
  // Arrange
  const input = 'test';
  
  // Act
  const result = await asyncFunctionToTest(input);
  
  // Assert
  expect(result).toBe(expectedOutput);
});
```

## Best Practices

1. **Test in isolation**: Mock dependencies to isolate the unit being tested
2. **Test behavior, not implementation**: Focus on what the code does, not how it does it
3. **Use descriptive test names**: Test names should describe the expected behavior
4. **Keep tests simple**: Each test should verify one specific behavior
5. **Use setup and teardown**: Use `beforeEach` and `afterEach` for common setup and cleanup
6. **Avoid test interdependence**: Tests should not depend on other tests

## Coverage Goals

We aim for at least 70% code coverage across:
- Statements
- Branches
- Functions
- Lines
