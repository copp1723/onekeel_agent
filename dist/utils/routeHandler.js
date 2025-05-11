/**
 * Wraps Express route handlers to fix TypeScript compatibility issues
 * and provide consistent error handling for async routes.
 */
export const routeHandler = (handler) => {
    return (req, res, next) => {
        try {
            const result = handler(req, res, next);
            if (result && typeof result.catch === 'function') {
                result.catch((err) => next(err));
            }
        }
        catch (err) {
            next(err);
        }
    };
};
//# sourceMappingURL=routeHandler.js.map