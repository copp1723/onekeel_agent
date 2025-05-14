import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, toAppError } from './errorTypes.js';
import { logger } from './logger.js';
/**
 * Log error details
 */
export function logError(error: AppError): void {
  const logData = {
    name: error.name,
    message:
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : String(error),
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    stack: error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined,
    context: error.context || {},
  };
  if (error.isOperational) {
    // Operational errors are expected errors that we want to log at info level
    logger.info('Operational error occurred', logData);
  } else {
    // Non-operational errors are unexpected and should be logged at error level
    logger.error('Non-operational error occurred', logData);
  }
}
/**
 * Format error response for API clients
 */
export function formatErrorResponse(
  error: AppError,
  includeStack: boolean = false
): Record<string, any> {
  const response: Record<string, any> = {
    status: 'error',
    statusCode: error.statusCode,
    message:
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : String(error),
  };
  // Include additional context for debugging if available
  if (error.context && Object.keys(error.context).length > 0) {
    response.context = error.context;
  }
  // Include stack trace in development environment
  if (
    includeStack &&
    (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined)
  ) {
    response.stack =
      error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined;
  }
  return response;
}
/**
 * Global error handler middleware for Express
 */
export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Convert to AppError if it's not already
  const appError = isAppError(error) ? error : toAppError(error);
  // Log the error
  logError(appError);
  // Send error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse = formatErrorResponse(appError, isDevelopment);
  res.status(appError.statusCode).json(errorResponse);
}
/**
 * Async handler to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
/**
 * Handle uncaught exceptions and unhandled rejections
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    const appError = isAppError(error) ? error : toAppError(error);
    logError(appError);
    // If it's a non-operational error, we should exit the process
    if (!appError.isOperational) {
      logger.error('Non-operational error occurred. Exiting process.');
      process.exit(1);
    }
  });
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    const appError = isAppError(reason) ? reason : toAppError(reason);
    logError(appError);
    // If it's a non-operational error, we should exit the process
    if (!appError.isOperational) {
      logger.error('Unhandled promise rejection with non-operational error. Exiting process.');
      process.exit(1);
    }
  });
}
/**
 * Try-catch wrapper for functions that return a value
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'An error occurred',
  context: Record<string, any> = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const appError = isAppError(error) ? error : toAppError(error, errorMessage);
    // Add additional context
    appError.context = { ...appError.context, ...context };
    // Log the error
    logError(appError);
    // Re-throw the error
    throw appError;
  }
}
/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
    maxDelay?: number;
    retryCondition?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffFactor = 2,
    maxDelay = 30000,
    retryCondition = () => true,
  } = options;
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Check if we should retry based on the error
      if (!retryCondition(error) || attempt >= maxRetries) {
        throw isAppError(error) ? error : toAppError(error);
      }
      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
      // Log retry attempt
      logger.info(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error)
            : String(error),
        attempt,
        maxRetries,
        delay,
      });
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // This should never be reached due to the throw in the catch block
  throw isAppError(lastError) ? lastError : toAppError(lastError);
}
