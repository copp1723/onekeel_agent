# Rate Limiting Documentation

## Overview

Rate limiting is a technique used to control the amount of incoming and outgoing traffic to or from a network, application, or service. In the context of our API, rate limiting helps to:

1. Prevent abuse and DoS attacks
2. Ensure fair usage of resources
3. Improve overall system stability
4. Protect against brute force attacks

## Implementation

Our rate limiting implementation uses the `express-rate-limit` middleware to track and limit requests based on various criteria.

### Default Configuration

- **Window Size**: 15 minutes
- **Max Requests**: 100 requests per window
- **Headers**: Both standard and legacy rate limit headers are included in responses

### Predefined Rate Limiters

We provide several predefined rate limiters for common use cases:

| Rate Limiter | Window Size | Max Requests | Purpose |
|--------------|-------------|--------------|---------|
| `api` | 15 minutes | 100 | General API endpoints |
| `auth` | 1 minute | 5 | Authentication endpoints |
| `taskSubmission` | 1 minute | 10 | Task submission endpoints |
| `healthCheck` | 1 minute | 30 | Health check endpoints |

### Response Headers

When rate limiting is enabled, the following headers are included in API responses:

- `X-RateLimit-Limit`: Maximum number of requests allowed in the current window
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Time (in seconds) until the rate limit window resets
- `Retry-After`: Time (in seconds) to wait before making another request (only sent when limit is exceeded)

### Rate Limit Exceeded Response

When a client exceeds the rate limit, they will receive a `429 Too Many Requests` response with a JSON body:

```json
{
  "status": "error",
  "statusCode": 429,
  "message": "Too many requests, please try again later.",
  "retryAfter": 900
}
```

## Usage

### Applying Rate Limiting to Routes

```typescript
import { rateLimiters } from '../shared/middleware/rateLimiter.js';

// Apply to all routes
app.use(rateLimiters.api);

// Apply to specific route
app.post('/api/auth/login', rateLimiters.auth, loginController);

// Apply to a group of routes
app.use('/api/tasks', rateLimiters.taskSubmission);
```

### Creating Custom Rate Limiters

You can create custom rate limiters for specific needs:

```typescript
import { createRateLimiter } from '../shared/middleware/rateLimiter.js';

// Create a custom rate limiter
const customLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 requests per 5 minutes
  message: 'Custom rate limit exceeded'
});

// Apply the custom rate limiter
app.use('/api/custom', customLimiter);
```

### Advanced Configuration

For more advanced use cases, you can customize the key generator function to implement different rate limiting strategies:

```typescript
// Rate limit based on user ID (requires authentication)
const userBasedLimiter = createRateLimiter({
  keyGenerator: (req) => {
    return req.user?.id || req.ip || 'unknown';
  },
  windowMs: 60 * 1000,
  max: 20
});

// Rate limit based on API key
const apiKeyBasedLimiter = createRateLimiter({
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || req.ip || 'unknown';
  },
  windowMs: 60 * 1000,
  max: 100
});
```

## Best Practices

1. **Set appropriate limits**: Consider the nature of each endpoint when setting limits
2. **Include clear error messages**: Help clients understand when they've hit a limit
3. **Use different limits for different endpoints**: More restrictive for sensitive operations
4. **Monitor rate limit events**: Track when clients hit limits to identify potential issues
5. **Consider authenticated vs. unauthenticated requests**: Typically allow higher limits for authenticated users

## Troubleshooting

If legitimate users are hitting rate limits too frequently:

1. Check the logs for rate limit exceeded events
2. Consider increasing the limits for specific endpoints
3. Implement different rate limiting strategies for different user types
4. Add bypass mechanisms for trusted clients if necessary
