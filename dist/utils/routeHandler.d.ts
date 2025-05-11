import { Request as ExpressRequest, Response, NextFunction } from 'express';
export type RouteHandler = (req: ExpressRequest, res: Response, next?: NextFunction) => Promise<any> | any;
/**
 * Helper function to wrap Express route handlers and provide consistent error handling
 * This also fixes TypeScript type compatibility issues with Express route handlers
 *
 * @param handler - Express route handler function
 * @returns Wrapped route handler with consistent error handling
 */
export declare function routeHandler(handler: RouteHandler): (req: ExpressRequest, res: Response, next: NextFunction) => any;
