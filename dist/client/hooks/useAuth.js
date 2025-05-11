/**
 * Custom hook for managing authentication state in the frontend
 */
export function useAuth() {
    // This is a simplified version since we're not using React
    // In a React app, this would use react-query or a similar library
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/user', {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin' // Important for sending cookies
            });
            if (response.ok) {
                const user = await response.json();
                return { user, isAuthenticated: true, isLoading: false };
            }
            else {
                return { user: null, isAuthenticated: false, isLoading: false };
            }
        }
        catch (error) {
            console.error('Error checking auth status:', error);
            return { user: null, isAuthenticated: false, isLoading: false, error };
        }
    }
    return {
        checkAuthStatus,
        login: () => { window.location.href = '/api/login'; },
        logout: () => { window.location.href = '/api/logout'; }
    };
}
//# sourceMappingURL=useAuth.js.map