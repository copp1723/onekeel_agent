// Main entry point for the AI Agent API server
import dotenv from 'dotenv';
import { app } from './api/server.js';
import logger from './utils/logger.js';
// Load environment variables
dotenv.config();
// Export the app for testing
export { app };
// Server will be started directly in server.ts
// This file serves only as an entry point to ensure all modules are loaded
logger.info(
  { event: 'server_start', timestamp: new Date().toISOString() },
  'Starting AI Agent API server'
);
// NOTE: This file serves as the main entry point
// Server setup and routes are defined in ./api/server.js
