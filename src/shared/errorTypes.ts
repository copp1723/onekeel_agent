/**
 * Custom error types for the application
 */
/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.name = this.constructor.name;
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}
/**
 * Error for invalid input data
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}
/**
 * Error for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 401, true, context);
  }
}
/**
 * Error for authorization failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 403, true, context);
  }
}
/**
 * Error for resource not found
 */
export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 404, true, context);
  }
}
/**
 * Error for database operations
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, true, context);
  }
}
/**
 * Error for external service failures
 */
export class ExternalServiceError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 502, true, context);
  }
}
/**
 * Error for rate limiting
 */
export class RateLimitError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 429, true, context);
  }
}
/**
 * Error for workflow execution failures
 */
export class WorkflowError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, true, context);
  }
}
/**
 * Error for email sending failures
 */
export class EmailError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, true, context);
  }
}
/**
 * Error for task parsing failures
 */
export class TaskParsingError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}
/**
 * Error for scheduler failures
 */
export class SchedulerError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, true, context);
  }
}
/**
 * Error for configuration issues
 */
export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, false, context);
  }
}
/**
 * Error for unexpected internal errors
 */
export class InternalError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, false, context);
  }
}
/**
 * Helper function to determine if an error is an instance of AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}
/**
 * Helper function to convert unknown errors to AppError
 */
export function toAppError(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): AppError {
  if (isAppError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return new InternalError(
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : String(error)
    );
  }
  return new InternalError(defaultMessage);
}
