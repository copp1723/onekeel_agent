import type { Express, RequestHandler } from "express";
declare module 'connect-pg-simple' {
    import session from 'express-session';
    function PgStore(options: any): session.Store;
    export = PgStore;
}
export declare function getSession(): any;
export declare function setupAuth(app: Express): Promise<void>;
export declare const isAuthenticated: RequestHandler;
