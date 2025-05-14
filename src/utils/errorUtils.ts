import { AppError } from '../types.js.js';
import { getErrorMessage, getErrorStack } from '../utils/errorUtils.js';
import { getErrorMessage, getErrorStack } from '../utils/errorUtils.js.js';
import { isError } from '../utils/errorUtils.js.js';
export interface ErrorWithMessage {
  message: string;
  stack?: string;
  name?: string;
}
/**
 * Type guard to check if an error is an instance of AppError
 * @param error The error to check
 * @returns True if the error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isOperational' in error &&
    'code' in error &&
    'statusCode' in error
  );
}
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}
export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;
  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there are circular references
    return new Error(String(maybeError));
  }
}
/**
 * Type guard to check if an object is an Error
 * @param error The object to check
 * @returns True if the object is an Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error));
  }
  return toErrorWithMessage(error).message;
}
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined);
  }
  return isErrorWithMessage(error) ? (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined) : undefined;
}
export function isCircuitOpenError(error: unknown): boolean {
  return isErrorWithMessage(error) && error.name === 'CircuitOpenError';
}
/**
 * Create a type-safe error object for logging
 * @param error The error object
 * @param context Additional context for the error
 * @returns An object with error details for logging
 */
export function createErrorLogObject(
  error: unknown,
  context: Record<string, any> = {}
): Record<string, any> {
  return {
    errorMessage: getErrorMessage(error),
    stack: getErrorStack(error),
    timestamp: new Date().toISOString(),
    ...context
  };
}