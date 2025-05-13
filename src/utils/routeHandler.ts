import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Extended Request interface with user property for authentication
 * This matches the structure used by Replit Auth
 */
export interface AuthenticatedRequest extends Omit<Request, 'isAuthenticated'> {
  user?: {
    claims?: {
      sub: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  isAuthenticated?(): boolean;
}

/**
 * Helper function to wrap Express route handlers and provide consistent error handling
 * This also fixes TypeScript type compatibility issues with Express route handlers
 *
 * @param handler - Express route handler function
 * @returns Wrapped route handler with consistent error handling
 */
export function routeHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
  handler: (req: AuthenticatedRequest, res: Response<ResBody>, next?: NextFunction) => any
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    try {
      // Use unknown as an intermediate type to avoid type errors
      const result = handler(req as unknown as AuthenticatedRequest, res, next);
      if (result instanceof Promise) {
        result.catch((error: Error) => {
          console.error('Route handler error:', error);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Internal server error',
              message: error.message
            } as any);
          }
        });
      }
      return result;
    } catch (error) {
      console.error('Route handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error)
        } as any);
      }
    }
  };
}