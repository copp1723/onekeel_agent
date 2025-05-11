import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps Express route handlers to fix TypeScript compatibility issues
 * and provide consistent error handling for async routes.
 */
export const routeHandler = <P = any, ResBody = any, ReqBody = any>(
  handler: (req: Request<P, ResBody, ReqBody>, res: Response<ResBody>, next: NextFunction) => Promise<void> | void
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = handler(req as Request<P, ResBody, ReqBody>, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch((err: Error) => next(err));
      }
    } catch (err) {
      next(err);
    }
  };
};