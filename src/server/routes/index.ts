import { Express } from 'express';
import authRouter from './auth.js';
import credentialsRouter from './credentials.js';
import { workflowRoutes } from './workflows.js';
import { registerScheduleRoutes } from './schedules.js';
import { setupAuth } from '../replitAuth.js';

/**
 * Register all auth and credential routes with the Express app
 * @param app Express application instance
 */
export async function registerAuthRoutes(app: Express): Promise<void> {
  // Set up authentication middleware and routes
  await setupAuth(app);
  
  // Register route handlers
  app.use('/api/auth', authRouter);
  app.use('/api/credentials', credentialsRouter);
  app.use('/api/workflows', workflowRoutes);
  
  // Register schedule routes
  registerScheduleRoutes(app);
  
  console.log('Auth, workflow, and schedule routes registered');
}