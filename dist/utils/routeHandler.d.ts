import type { Request, Response, NextFunction, RequestHandler } from 'express';
/**
 * Wraps Express route handlers to fix TypeScript compatibility issues
 * and provide consistent error handling for async routes.
 */
export declare const routeHandler: <P = any, ResBody = any, ReqBody = any>(handler: (req: Request<P, ResBody, ReqBody>, res: Response<ResBody>, next: NextFunction) => Promise<void> | void) => RequestHandler;
