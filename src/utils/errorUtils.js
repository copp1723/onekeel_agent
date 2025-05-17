/**
 * Type guard to check if an error is an instance of AppError
 * This delegates to the implementation in errorTypes.js
 */
import { isAppError as _isAppError } from "../shared/errorTypes.js";

export { _isAppError as isAppError };
export function isErrorWithMessage(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string');
}
export function toErrorWithMessage(maybeError) {
    if (isErrorWithMessage(maybeError))
        return maybeError;
    try {
        return new Error(JSON.stringify(maybeError));
    }
    catch (_a) {
        // fallback in case there are circular references
        return new Error(String(maybeError));
    }
}
/**
 * Type guard to check if an object is an Error
 */
export function isError(error) {
    return error instanceof Error;
}
export function getErrorMessage(error) {
    if (isError(error)) {
        return error.message;
    }
    return toErrorWithMessage(error).message;
}
export function getErrorStack(error) {
    if (isError(error)) {
        return error.stack;
    }
    if (isErrorWithMessage(error)) {
        return error.stack;
    }
    return undefined;
}
export function isCircuitOpenError(error) {
    return isErrorWithMessage(error) && error.name === 'CircuitOpenError';
}
/**
 * Create a type-safe error object for logging
 */
export function createErrorLogObject(error, context) {
    if (context === void 0) { context = {}; }
    return __assign({ errorMessage: getErrorMessage(error), stack: getErrorStack(error), timestamp: new Date().toISOString() }, context);
}
