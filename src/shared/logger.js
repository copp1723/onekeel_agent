"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
exports.logInsightRun = logInsightRun;
exports.getTaskLogs = getTaskLogs;
/**
 * Logger Module
 *
 * This module provides centralized logging functionality for the application.
 * It supports different log levels and can log to both console and files.
 */
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
// Ensure logs directory exists
var logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Log file paths
var generalLogPath = path_1.default.join(logsDir, 'general.log');
var insightRunsLogPath = path_1.default.join(logsDir, 'insight_runs.log');
// Log levels
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["FATAL"] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Write to log file with timestamp
 * @param filePath - Path to the log file
 * @param level - Log level
 * @param message - Message to log
 * @param meta - Optional metadata to include
 */
function writeToLogFile(filePath, level, message, meta) {
    try {
        var timestamp = new Date().toISOString();
        var metaString = meta ? "\n".concat(JSON.stringify(meta, null, 2)) : '';
        var logEntry = "[".concat(timestamp, "] [").concat(level, "] ").concat(message).concat(metaString, "\n");
        fs_1.default.appendFileSync(filePath, logEntry);
    }
    catch (error) {
        console.error('Failed to write to log file:', error);
    }
}
/**
 * General purpose logger for application events
 */
exports.logger = {
    debug: function (message, meta) {
        console.debug("[DEBUG] ".concat(message));
        writeToLogFile(generalLogPath, LogLevel.DEBUG, message, meta);
    },
    info: function (message, meta) {
        console.info("[INFO] ".concat(message));
        writeToLogFile(generalLogPath, LogLevel.INFO, message, meta);
    },
    warn: function (message, meta) {
        console.warn("[WARN] ".concat(message));
        writeToLogFile(generalLogPath, LogLevel.WARN, message, meta);
    },
    error: function (message, meta) {
        console.error("[ERROR] ".concat(message));
        writeToLogFile(generalLogPath, LogLevel.ERROR, message, meta);
    },
    fatal: function (message, meta) {
        console.error("[FATAL] ".concat(message));
        writeToLogFile(generalLogPath, LogLevel.FATAL, message, meta);
    },
};
/**
 * Log insight generation run details
 * @param data - Insight run log data
 */
function logInsightRun(data) {
    // Add timestamp if not provided
    var logData = __assign(__assign({}, data), { timestamp: data.timestamp || new Date().toISOString() });
    // Log to console
    console.info("[INSIGHT RUN] Platform: ".concat(logData.platform, ", Intent: ").concat(logData.promptIntent, ", Version: ").concat(logData.promptVersion));
    console.info("[INSIGHT RUN] Duration: ".concat(logData.durationMs, "ms, File: ").concat(logData.inputFile || 'direct content'));
    if (logData.error) {
        console.error("[INSIGHT RUN] Error: ".concat(logData.error));
    }
    else {
        console.info("[INSIGHT RUN] Generated ".concat(logData.outputSummary.length, " insights"));
    }
    // Write to insight runs log file
    writeToLogFile(insightRunsLogPath, LogLevel.INFO, 'Insight Generation Run', logData);
}
/**
 * Get task logs from DB (placeholder for DB integration)
 * @param taskId - Task ID to retrieve logs for
 * @returns Array of log entries
 */
function getTaskLogs(taskId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // This is a placeholder. In a real implementation, this would
            // fetch logs from a database or other persistent storage.
            return [2 /*return*/, ["Task ".concat(taskId, " logs would be retrieved from DB")]];
        });
    });
}
