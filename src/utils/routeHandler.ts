import { Request as ExpressRequest, Response, NextFunction } from 'express';

// RouteHandler type to make Express handler types more flexible
export type RouteHandler = (
  req: ExpressRequest, 
  res: Response, 
  next?: NextFunction
) => Promise<any> | any;

/**
 * Helper function to wrap Express route handlers and provide consistent error handling
 * This also fixes TypeScript type compatibility issues with Express route handlers
 * 
 * @param handler - Express route handler function
 * @returns Wrapped route handler with consistent error handling
 */
export function routeHandler(handler: RouteHandler) {
  return (req: ExpressRequest, res: Response, next: NextFunction) => {
    try {
      const result = handler(req, res, next);
      if (result instanceof Promise) {
        result.catch((error: Error) => {
          console.error('Route handler error:', error);
          if (!res.headersSent) {
            res.status(500).json({ 
              error: 'Internal server error', 
              message: error.message 
            });
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
        });
      }
    }
  };
}