import authRouter from './auth.js';
import credentialsRouter from './credentials.js';
import { setupAuth } from '../replitAuth.js';
/**
 * Register all auth and credential routes with the Express app
 * @param app Express application instance
 */
export async function registerAuthRoutes(app) {
    // Set up authentication middleware and routes
    await setupAuth(app);
    // Register route handlers
    app.use('/api/auth', authRouter);
    app.use('/api/credentials', credentialsRouter);
}
//# sourceMappingURL=index.js.map