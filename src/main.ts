// Main entry point for the AI Agent API server
import dotenv from 'dotenv';
import { app, server } from './api/server.js';

// Load environment variables
dotenv.config();

// Export the app and server for testing
export { app, server };