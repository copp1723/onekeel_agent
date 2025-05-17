"use strict";
/**
 * Centralized error handling utilities and error classes
 *
 * This module provides a consistent way to handle errors across the application,
 * including custom error classes, error boundaries, and error formatting.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundary = exports.CodedError = exports.ERROR_CODES = void 0;
exports.formatErrorForResponse = formatErrorForResponse;
exports.logError = logError;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
exports.withErrorHandling = withErrorHandling;
exports.assert = assert;
exports.assertDefined = assertDefined;
var logger_js_1 = require("../shared/logger.js");
var errorTypes_js_1 = require("../shared/errorTypes.js");
// Re-export error types for convenience
__exportStar(require("../shared/errorTypes.js"), exports);
/**
 * Error codes for common error scenarios
 */
exports.ERROR_CODES = {
    // General errors (1000-1999)
    UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    // Authentication & Authorization (2000-2999)
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    // Resource errors (3000-3999)
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    // Database errors (4000-4999)
    DATABASE_ERROR: 'DATABASE_ERROR',
    DUPLICATE_KEY: 'DUPLICATE_KEY',
    TRANSACTION_ERROR: 'TRANSACTION_ERROR',
    // External service errors (5000-5999)
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    EXTERNAL_SERVICE_TIMEOUT: 'EXTERNAL_SERVICE_TIMEOUT',
    // Workflow errors (6000-6999)
    WORKFLOW_ERROR: 'WORKFLOW_ERROR',
    TASK_ERROR: 'TASK_ERROR',
    // Rate limiting (7000-7999)
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    // Email errors (8000-8999)
    EMAIL_SEND_ERROR: 'EMAIL_SEND_ERROR',
    EMAIL_VALIDATION_ERROR: 'EMAIL_VALIDATION_ERROR',
};
/**
 * Extended AppError with error codes and additional context
 */
var CodedError = /** @class */ (function (_super) {
    __extends(CodedError, _super);
    function CodedError(message, code, statusCode, context, isOperational) {
        if (code === void 0) { code = 'UNEXPECTED_ERROR'; }
        if (statusCode === void 0) { statusCode = 500; }
        if (context === void 0) { context = {}; }
        if (isOperational === void 0) { isOperational = true; }
        var _this = _super.call(this, message, statusCode, isOperational, __assign(__assign({}, context), { errorCode: code })) || this;
        _this.code = code;
        _this.name = _this.constructor.name;
        return _this;
    }
    return CodedError;
}(errorTypes_js_1.AppError));
exports.CodedError = CodedError;
/**
 * Format an error for API responses
 */
function formatErrorForResponse(error, includeDetails) {
    var _a;
    if (includeDetails === void 0) { includeDetails = process.env.NODE_ENV !== 'production'; }
    var appError = (0, errorTypes_js_1.toAppError)(error);
    var response = {
        status: 'error',
        code: ((_a = appError.context) === null || _a === void 0 ? void 0 : _a.errorCode) || 'INTERNAL_SERVER_ERROR',
        message: appError.message,
    };
    if (includeDetails) {
        response.details = __assign({ name: appError.name, stack: appError.stack }, (appError.context || {}));
    }
    return response;
}
/**
 * Log an error with appropriate level based on error type
 */
function logError(error, context) {
    var _a;
    if (context === void 0) { context = {}; }
    var appError = (0, errorTypes_js_1.toAppError)(error);
    var logData = {
        error: {
            name: appError.name,
            message: appError.message,
            code: (_a = appError.context) === null || _a === void 0 ? void 0 : _a.errorCode,
            stack: appError.stack,
            statusCode: appError.statusCode,
            isOperational: appError.isOperational,
        },
        context: __assign(__assign({}, (appError.context || {})), context),
        timestamp: new Date().toISOString(),
    };
    if (appError.isOperational) {
        logger_js_1.logger.warn('Operational error occurred', logData);
    }
    else {
        logger_js_1.logger.error('Unexpected error occurred', logData);
    }
}
/**
 * Error boundary for React components
 * Note: This is a placeholder. In a real implementation, this would be imported from React.
 * For TypeScript compilation, we're using a simplified version.
 */
// This is a simplified version for TypeScript compilation
var ErrorBoundary = /** @class */ (function () {
    function ErrorBoundary(_props) {
        // Implementation would be provided in a React environment
    }
    return ErrorBoundary;
}());
exports.ErrorBoundary = ErrorBoundary;
/**
 * Express error handler middleware
 */
function errorHandler(error, req, res, _next // Prefix with underscore to indicate it's not used
) {
    var appError = (0, errorTypes_js_1.toAppError)(error);
    // Log the error
    logError(appError, {
        path: req.path,
        method: req.method,
        params: req.params,
        query: req.query,
        // Don't log the entire body as it might contain sensitive data
        body: Object.keys(req.body || {}).length > 0 ? '[REDACTED]' : undefined,
    });
    // Format the error response
    var response = formatErrorForResponse(appError, process.env.NODE_ENV !== 'production');
    // Send the response
    res.status(appError.statusCode).json(response);
}
/**
 * Async handler for Express routes
 */
function asyncHandler(handler) {
    var _this = this;
    return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, handler(req, res, next)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    next(error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
}
/**
 * Wrap a function with error handling and logging
 */
function withErrorHandling(fn, context, options) {
    var _this = this;
    if (context === void 0) { context = 'unknown'; }
    if (options === void 0) { options = {}; }
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var error_2, appError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fn.apply(void 0, args)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_2 = _a.sent();
                        appError = (0, errorTypes_js_1.toAppError)(error_2);
                        if (options.logError !== false) {
                            logError(appError, { context: context });
                        }
                        if (options.rethrow) {
                            throw options.defaultError || appError;
                        }
                        // Return a rejected promise with the error
                        return [2 /*return*/, Promise.reject(options.defaultError || appError)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
}
/**
 * Assert that a condition is true, otherwise throw an error
 */
function assert(condition, message, code, statusCode) {
    if (code === void 0) { code = 'VALIDATION_ERROR'; }
    if (statusCode === void 0) { statusCode = 400; }
    if (!condition) {
        throw new CodedError(message, code, statusCode);
    }
}
/**
 * Assert that a value is not null or undefined
 */
function assertDefined(value, message, code, statusCode) {
    if (message === void 0) { message = 'Value is required'; }
    if (code === void 0) { code = 'VALIDATION_ERROR'; }
    if (statusCode === void 0) { statusCode = 400; }
    if (value === null || value === undefined) {
        throw new CodedError(message, code, statusCode);
    }
}
