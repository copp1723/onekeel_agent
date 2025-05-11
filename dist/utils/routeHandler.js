/**
 * Helper function to wrap Express route handlers and provide consistent error handling
 * This also fixes TypeScript type compatibility issues with Express route handlers
 *
 * @param handler - Express route handler function
 * @returns Wrapped route handler with consistent error handling
 */
export function routeHandler(handler) {
    return (req, res, next) => {
        try {
            const result = handler(req, res, next);
            if (result instanceof Promise) {
                result.catch((error) => {
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
        }
        catch (error) {
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
//# sourceMappingURL=routeHandler.js.map