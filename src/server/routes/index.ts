import { Express } from 'express';
import authRouter from './auth';
import credentialsRouter from './credentials';
import { setupAuth } from '../replitAuth';

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
}