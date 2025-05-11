// Main entry point for the AI Agent API server
import dotenv from 'dotenv';
import express from 'express';
import * as crypto from 'crypto';
import { app, server } from './api/server.js';

// Load environment variables
dotenv.config();

// Export the app and server for testing
export { app, server };

// NOTE: This file serves as the main entry point
// Server setup and routes are defined in ./api/server.js
