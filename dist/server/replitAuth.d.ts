import type { Express, RequestHandler } from "express";
declare global {
    namespace Express {
        interface User {
            claims?: any;
            access_token?: string;
            refresh_token?: string;
            expires_at?: number;
            [key: string]: any;
        }
    }
}
export declare function getSession(): any;
export declare function setupAuth(app: Express): Promise<void>;
export declare const isAuthenticated: RequestHandler;
