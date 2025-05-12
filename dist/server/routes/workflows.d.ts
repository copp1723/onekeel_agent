declare global {
    namespace Express {
        interface User {
            claims?: {
                sub: string;
                email?: string;
                [key: string]: any;
            };
            [key: string]: any;
        }
    }
}
export declare const workflowRoutes: import("express-serve-static-core").Router;
