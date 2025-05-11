/**
 * Custom hook for managing authentication state in the frontend
 */
export declare function useAuth(): {
    checkAuthStatus: () => Promise<{
        user: any;
        isAuthenticated: boolean;
        isLoading: boolean;
        error?: never;
    } | {
        user: null;
        isAuthenticated: boolean;
        isLoading: boolean;
        error: unknown;
    }>;
    login: () => void;
    logout: () => void;
};
