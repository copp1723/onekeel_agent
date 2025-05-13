# Error Handling Guide

This document outlines the error handling patterns used in the AgentFlow application.

## Error Types

The application uses a hierarchy of error types to represent different kinds of errors:

- `AppError`: Base error class for all application errors
  - `ValidationError`: Invalid input data (400)
  - `AuthenticationError`: Authentication failures (401)
  - `AuthorizationError`: Authorization failures (403)
  - `NotFoundError`: Resource not found (404)
  - `RateLimitError`: Rate limiting (429)
  - `DatabaseError`: Database operation failures (500)
  - `ExternalServiceError`: External service failures (502)
  - `WorkflowError`: Workflow execution failures (500)
  - `EmailError`: Email sending failures (500)
  - `TaskParsingError`: Task parsing failures (400)
  - `SchedulerError`: Scheduler failures (500)
  - `ConfigurationError`: Configuration issues (500)
  - `InternalError`: Unexpected internal errors (500)

## Error Properties

Each error includes the following properties:

- `message`: Human-readable error message
- `statusCode`: HTTP status code for API responses
- `isOperational`: Whether the error is expected/operational
- `context`: Additional context about the error (optional)
- `stack`: Stack trace (automatically captured)

## Using Error Types

### Throwing Errors

```typescript
import { ValidationError, DatabaseError } from '../shared/errorTypes.js';

// Throw a validation error
if (!isValid(data)) {
  throw new ValidationError('Invalid data format', { data });
}

// Throw a database error
try {
  await db.insert(table).values(data);
} catch (error) {
  throw new DatabaseError('Failed to insert data', { table, data });
}
```

### Converting Unknown Errors

```typescript
import { toAppError } from '../shared/errorTypes.js';

try {
  // Some operation that might throw
} catch (error) {
  // Convert to AppError
  const appError = toAppError(error, 'Failed to process request');
  // Handle the error
}
```

## Error Handling Patterns

### Express Route Handlers

Use the `asyncHandler` wrapper for async route handlers:

```typescript
import { asyncHandler } from '../shared/errorHandler.js';
import { NotFoundError } from '../shared/errorTypes.js';

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User not found', { userId: req.params.id });
  }
  
  res.json(user);
}));
```

### Try-Catch Wrapper

Use the `tryCatch` utility for functions that return a value:

```typescript
import { tryCatch } from '../shared/errorHandler.js';

async function getUserData(userId: string) {
  return tryCatch(
    async () => {
      // Database operations or other logic
      return await db.select().from(users).where(eq(users.id, userId));
    },
    'Failed to get user data',
    { userId }
  );
}
```

### Retry with Backoff

Use the `retryWithBackoff` utility for operations that might fail temporarily:

```typescript
import { retryWithBackoff } from '../shared/errorHandler.js';
import { ExternalServiceError } from '../shared/errorTypes.js';

async function fetchExternalData(url: string) {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new ExternalServiceError('Failed to fetch data', { 
          url, 
          status: response.status 
        });
      }
      
      return response.json();
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      backoffFactor: 2,
      retryCondition: (error) => {
        // Only retry on network errors or 5xx responses
        return error instanceof ExternalServiceError && error.statusCode >= 500;
      }
    }
  );
}
```

## Error Logging

Errors are automatically logged with appropriate log levels:

- Operational errors (expected): `info` level
- Non-operational errors (unexpected): `error` level

The log includes:
- Error name
- Error message
- Status code
- Stack trace
- Additional context

## Global Error Handling

The application sets up global error handlers for:

1. Express middleware errors
2. Uncaught exceptions
3. Unhandled promise rejections

For non-operational errors, the process will exit with code 1 to prevent the application from running in an unstable state.

## Best Practices

1. **Be specific**: Use the most specific error type for the situation
2. **Include context**: Add relevant data to the error context
3. **User-friendly messages**: Write clear error messages for API responses
4. **Operational vs. non-operational**: Mark errors as operational if they're expected
5. **Consistent patterns**: Use the provided utilities consistently
6. **Graceful degradation**: Handle errors at appropriate levels
7. **Security**: Don't expose sensitive information in error messages

## Example: Complete Error Handling Flow

```typescript
import { asyncHandler } from '../shared/errorHandler.js';
import { ValidationError, NotFoundError, DatabaseError } from '../shared/errorTypes.js';

// Validate input
function validateUserData(data) {
  if (!data.email) {
    throw new ValidationError('Email is required', { data });
  }
  // More validation...
}

// Route handler with error handling
router.post('/users', asyncHandler(async (req, res) => {
  // Validate input
  validateUserData(req.body);
  
  try {
    // Create user
    const userId = await createUser(req.body);
    
    // Get created user
    const user = await getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User was created but could not be retrieved', { userId });
    }
    
    // Return success response
    res.status(201).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    // This will be caught by asyncHandler and passed to the global error handler
    if (error.code === 'DUPLICATE_KEY') {
      throw new ValidationError('Email already in use', { email: req.body.email });
    }
    
    throw new DatabaseError('Failed to create user', { 
      originalError: error.message 
    });
  }
}));
```
