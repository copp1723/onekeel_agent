/**
 * Custom hook for managing authentication state in the frontend
 */
export declare function useAuth(): {
    checkAuthStatus: () => Promise<{
        user: any;
        isAuthenticated: boolean;
        isLoading: boolean;
        error?: undefined;
    } | {
        user: any;
        isAuthenticated: boolean;
        isLoading: boolean;
        error: any;
    }>;
    login: () => void;
    logout: () => void;
};
