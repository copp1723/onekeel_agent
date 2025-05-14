import pino, { Level, Logger } from 'pino';
import path from 'path';
import fs from 'fs';
import { getErrorMessage, getErrorStack } from './errorUtils.js';
// Ensure log directory exists
const logDirectory = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}
// Create rotating file stream for logs
const createRotatingStream = require('rotating-file-stream');
const baseOptions = {
  level: process.env.LOG_LEVEL || 'info',
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
};
// Create streams array
const streams: pino.StreamEntry[] = [];
// Add file stream if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const fileStream = createRotatingStream('app.log', {
    size: '10M',
    interval: '1d',
    compress: 'gzip',
  });
  streams.push({
    level: baseOptions.level as Level,
    stream: fileStream,
  });
}
// Add pretty console output in development
if (process.env.NODE_ENV === 'development') {
  const pretty = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  });
  streams.push({ level: 'debug' as Level, stream: pretty });
}
// Create logger instance with multiple streams
const logger: Logger = pino(baseOptions, pino.multistream(streams)) as Logger;
// Add error context formatter
export function formatError(error: unknown) {
  return {
    errorMessage: getErrorMessage(error),
    stack: getErrorStack(error),
  };
}
export { logger };
export default logger;
