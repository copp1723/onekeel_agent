# Retry and Circuit Breaker Patterns

This document describes the retry and circuit breaker patterns implemented in the AgentFlow application to enhance system reliability and resilience.

## Overview

The AgentFlow application implements two key reliability patterns:

1. **Retry Pattern**: Automatically retries failed operations with exponential backoff to handle transient failures.
2. **Circuit Breaker Pattern**: Prevents repeated calls to failing services, allowing them time to recover and preventing cascading failures.

These patterns are implemented in the following utility modules:
- `src/utils/retry.ts`: Provides configurable retry mechanisms
- `src/utils/circuitBreaker.ts`: Implements the circuit breaker pattern

## Retry Pattern

The retry utility provides a way to automatically retry failed operations with configurable backoff strategies.

### Features

- Configurable retry count, delays, and backoff factors
- Exponential backoff with optional jitter
- Custom retry conditions based on error types
- Timeout limits for total retry duration
- Detailed logging of retry attempts
- Support for both promise-based and callback-based operations

### Usage

```typescript
import { retry } from '../utils/retry.js';

// Basic usage
const result = await retry(
  async () => {
    // Your async operation that might fail
    return await fetchDataFromApi();
  },
  {
    retries: 3,           // Number of retry attempts
    minTimeout: 1000,     // Initial delay in ms
    factor: 2,            // Backoff factor
    jitter: true          // Add randomness to delays
  }
);

// Advanced usage with custom retry conditions
const result = await retry(
  async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return response.json();
  },
  {
    retries: 5,
    minTimeout: 1000,
    maxTimeout: 30000,    // Maximum delay between retries
    factor: 2,
    jitter: true,
    maxRetryTime: 60000,  // Maximum total time for all retries
    retryIf: (error) => {
      // Only retry on network errors or 5xx responses
      const status = error?.response?.status;
      return error.name === 'NetworkError' || (status && status >= 500);
    },
    onRetry: (error, attempt) => {
      console.warn(`Retry attempt ${attempt} after error:`, error);
    }
  }
);

// Creating a retryable function
const fetchWithRetry = retryable(
  async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return response.json();
  },
  {
    retries: 3,
    minTimeout: 1000,
    factor: 2
  }
);

// Use the retryable function
const data = await fetchWithRetry('https://api.example.com/data');
```

## Circuit Breaker Pattern

The circuit breaker prevents repeated calls to failing services, allowing them time to recover and preventing cascading failures.

### States

The circuit breaker has three states:

1. **CLOSED**: Normal operation, requests pass through
2. **OPEN**: Circuit is open, requests fail fast without calling the service
3. **HALF-OPEN**: Testing if the service has recovered by allowing a limited number of requests

### Features

- Configurable failure threshold, reset timeout, and success threshold
- In-memory or database-backed state tracking
- Custom failure detection logic
- State change notifications
- Timeout protection for protected functions
- Detailed logging of state changes

### Usage

```typescript
import { CircuitBreaker } from '../utils/circuitBreaker.js';

// Create a circuit breaker
const breaker = new CircuitBreaker('api-service', {
  failureThreshold: 5,     // Number of failures before opening
  resetTimeout: 30000,     // Time in ms to wait before trying again
  successThreshold: 2,     // Successes needed to close circuit
  timeout: 10000,          // Timeout for protected function
  isFailure: (error) => {  // Custom failure detection
    return error.name !== 'ValidationError'; // Don't count validation errors
  },
  onStateChange: (from, to) => {
    console.log(`Circuit state changed from ${from} to ${to}`);
  },
  inMemory: true           // Use in-memory state (vs database)
});

// Use the circuit breaker
try {
  const result = await breaker.execute(async () => {
    return await callExternalService();
  });
  // Process result
} catch (error) {
  if (error.name === 'CircuitOpenError') {
    // Handle circuit open case (e.g., use fallback)
    console.log('Circuit is open, using fallback');
  } else {
    // Handle other errors
    console.error('Service call failed:', error);
  }
}

// Reset the circuit (e.g., after manual intervention)
await breaker.reset();
```

## Implementation Details

### Database Schema

The circuit breaker pattern uses a database table to track circuit state across multiple instances:

```sql
CREATE TABLE IF NOT EXISTS circuit_breakers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  state VARCHAR(20) NOT NULL DEFAULT 'CLOSED',
  failures INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  last_failure TIMESTAMP WITH TIME ZONE,
  last_success TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Applied Components

The retry and circuit breaker patterns are applied to the following critical operations:

1. **Email Operations**:
   - IMAP connections for fetching reports
   - SMTP operations for sending emails
   - OTP verification

2. **File Operations**:
   - Parsing CSV, Excel, and PDF files
   - Saving attachments

3. **API Calls**:
   - External service calls
   - Insight generation API calls

4. **Orchestration Flow**:
   - End-to-end email ingestion process

## Best Practices

1. **Use Appropriate Retry Counts**: Don't retry too many times (3-5 is usually sufficient)
2. **Use Exponential Backoff**: Increase delay between retries exponentially
3. **Add Jitter**: Add randomness to retry delays to prevent thundering herd problems
4. **Set Maximum Retry Time**: Limit the total time spent on retries
5. **Be Selective About Retrying**: Only retry on transient errors, not on validation or authorization errors
6. **Monitor Circuit Breaker States**: Log and alert on circuit state changes
7. **Use Fallbacks**: Provide fallback mechanisms when circuits are open
8. **Reset Circuits Manually**: In some cases, manual intervention may be needed

## Testing

The retry and circuit breaker utilities include comprehensive unit tests:

- `src/__tests__/utils/retry.test.ts`
- `src/__tests__/utils/circuitBreaker.test.ts`

These tests verify behavior under various failure scenarios, including:
- Transient failures that resolve after retries
- Permanent failures that never resolve
- Timeout scenarios
- Circuit state transitions
- Database persistence of circuit state
