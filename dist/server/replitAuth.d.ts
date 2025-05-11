import type { Express, RequestHandler } from "express";
export declare function getSession(): RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare function setupAuth(app: Express): Promise<void>;
export declare const isAuthenticated: RequestHandler;
