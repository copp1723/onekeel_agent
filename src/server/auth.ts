/**
 * Authentication middleware for Express routes
 */
import { Request, Response, NextFunction } from 'express';
// Define custom Request interface with user property
interface AuthRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}
/**
 * Middleware to check if a user is authenticated
 * Secure version for both development and production
 */
export const isAuthenticated = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check for development API key header
  const devApiKey = req.headers['x-dev-api-key'];
  const configuredDevApiKey = process.env.DEV_API_KEY;

  // If we're in development mode and DEV_API_KEY is configured
  if (process.env.NODE_ENV !== 'production' && configuredDevApiKey) {
    if (!devApiKey || devApiKey !== configuredDevApiKey) {
      console.warn('Development API key authentication failed');
      return res.status(401).json({
        message: 'Unauthorized - Invalid development API key',
        error: 'dev_api_key_invalid'
      });
    }

    // Set up a development user with the API key
    req.user = {
      claims: {
        sub: 'dev-user-123',
        name: 'Development User',
        email: 'dev@example.com',
        role: 'developer'
      }
    };

    console.log('Authenticated with development API key');
    return next();
  }

  // If we're in development mode but no DEV_API_KEY is configured
  if (process.env.NODE_ENV !== 'production' && !configuredDevApiKey) {
    console.warn('WARNING: No DEV_API_KEY configured. Using insecure development mode.');
    console.warn('Set DEV_API_KEY in your environment for secure local development.');

    // Set up a development user for the request
    req.user = {
      claims: {
        sub: 'dev-user-123',
        name: 'Development User',
        email: 'dev@example.com',
        role: 'developer'
      }
    };

    return next();
  }

  // In production, we should have a proper authentication mechanism
  // This is a placeholder that should be replaced with actual JWT validation
  if (!req.user || !req.user.claims || !req.user.claims.sub) {
    return res.status(401).json({
      message: 'Unauthorized - Valid authentication required',
      error: 'authentication_required'
    });
  }

  next();
};
/**
 * Middleware to check if a user has admin role
 */
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check if user is authenticated first
  if (!req.user || !req.user.claims) {
    return res.status(401).json({
      message: 'Unauthorized - Authentication required',
      error: 'authentication_required'
    });
  }

  // In development mode with DEV_API_KEY, check for admin role
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_API_KEY) {
    // Check if the user has the admin role
    const isUserAdmin = req.user.claims.role === 'admin' ||
                        req.headers['x-dev-admin'] === 'true';

    if (!isUserAdmin) {
      console.warn('Development admin access denied');
      return res.status(403).json({
        message: 'Forbidden - Admin access required',
        error: 'admin_access_required'
      });
    }

    console.log('Admin access granted in development mode');
    return next();
  }

  // In development mode without DEV_API_KEY, warn but allow access
  if (process.env.NODE_ENV !== 'production' && !process.env.DEV_API_KEY) {
    console.warn('WARNING: Insecure admin access in development mode');
    console.warn('Set DEV_API_KEY in your environment for secure admin access control');
    return next();
  }

  // In production, check for admin role in user claims
  const isUserAdmin = req.user.claims.role === 'admin';
  if (!isUserAdmin) {
    return res.status(403).json({
      message: 'Forbidden - Admin access required',
      error: 'admin_access_required'
    });
  }

  next();
};
