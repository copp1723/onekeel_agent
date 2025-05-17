// Error code constants
export const ERROR_CODES = {
  // General errors (1xx)
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  
  // Authentication/Authorization (2xx)
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Resource errors (3xx)
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',
  
  // Database errors (4xx)
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  
  // External service errors (5xx)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Business logic errors (6xx)
  INVALID_STATE: 'INVALID_STATE',
  INVALID_OPERATION: 'INVALID_OPERATION',
  WORKFLOW_ERROR: 'WORKFLOW_ERROR',
  
  // File/IO errors (7xx)
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  
  // Network errors (8xx)
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Payment errors (9xx)
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED'
};

// Base error class
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Add additional context to the error
   */
  withContext(context) {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Convert error to a plain object for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Error class for validation errors
export class ValidationError extends AppError {
  constructor(message, context = {}) {
    super(message || 'Validation failed', 400, true, context);
    this.name = 'ValidationError';
  }
}

// Error class for authentication failures
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', context = {}) {
    super(message, 401, true, context);
    this.name = 'AuthenticationError';
  }
}

// Error class for authorization failures
export class AuthorizationError extends AppError {
  constructor(message = 'Not authorized', context = {}) {
    super(message, 403, true, context);
    this.name = 'AuthorizationError';
  }
}

// Error class for resource not found
export class NotFoundError extends AppError {
  constructor(resource, context = {}) {
    super(`Resource not found: ${resource}`, 404, true, context);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

// Error class for database operations
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', context = {}) {
    super(message, 500, true, context);
    this.name = 'DatabaseError';
  }
}

// Error class for external service failures
export class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error', context = {}) {
    super(`${service}: ${message}`, 502, true, { ...context, service });
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

// Error class for rate limiting
export class RateLimitError extends AppError {
  constructor(limit, window, context = {}) {
    super('Rate limit exceeded', 429, true, { ...context, limit, window });
    this.name = 'RateLimitError';
  }
}

// Error class for workflow execution failures
export class WorkflowError extends AppError {
  constructor(workflowId, message = 'Workflow execution failed', context = {}) {
    super(message, 500, true, { ...context, workflowId });
    this.name = 'WorkflowError';
    this.workflowId = workflowId;
  }
}

// Error class for email sending failures
export class EmailError extends AppError {
  constructor(message = 'Email sending failed', context = {}) {
    super(message, 500, true, context);
    this.name = 'EmailError';
  }
}

// Error class for task parsing failures
export class TaskParsingError extends AppError {
  constructor(message = 'Failed to parse task', context = {}) {
    super(message, 400, true, context);
    this.name = 'TaskParsingError';
  }
}

// Error class for scheduler failures
export class SchedulerError extends AppError {
  constructor(message = 'Scheduler operation failed', context = {}) {
    super(message, 500, true, context);
    this.name = 'SchedulerError';
  }
}

// Error class for configuration issues
export class ConfigurationError extends AppError {
  constructor(message = 'Configuration error', context = {}) {
    super(message, 500, true, context);
    this.name = 'ConfigurationError';
  }
}

// Error class for unexpected internal errors
export class InternalError extends AppError {
  constructor(message = 'Internal server error', context = {}) {
    super(message, 500, false, context);
    this.name = 'InternalError';
  }
}

/**
 * Helper function to determine if an error is an instance of AppError
 */
export function isAppError(error) {
  return (
    error instanceof AppError ||
    (error && 
     typeof error === 'object' && 
     'isOperational' in error && 
     'statusCode' in error)
  );
}

/**
 * Helper function to convert unknown errors to AppError
 */
export function toAppError(error, defaultMessage = 'An unexpected error occurred') {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new InternalError(error.message, { cause: error });
  }
  
  if (typeof error === 'string') {
    return new InternalError(error);
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return new InternalError(String(error.message), { cause: error });
  }
  
  return new InternalError(defaultMessage, { originalError: error });
}
