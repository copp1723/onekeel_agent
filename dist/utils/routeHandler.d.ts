import { Request, Response, NextFunction, RequestHandler } from 'express';
type AnyRequest = Request & {
    [key: string]: any;
    user?: {
        claims?: {
            sub: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
};
/**
 * Helper function to wrap Express route handlers and provide consistent error handling
 * This also fixes TypeScript type compatibility issues with Express route handlers
 *
 * @param handler - Express route handler function
 * @returns Wrapped route handler with consistent error handling
 */
export declare function routeHandler<P = any>(handler: (req: AnyRequest, res: Response, next?: NextFunction) => any): RequestHandler<P>;
export {};
