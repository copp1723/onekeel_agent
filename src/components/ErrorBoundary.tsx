import React from 'react';
import { logError } from '../shared/errorHandler.js';

interface ErrorBoundaryProps {
  /**
   * Content to render when there's no error
   */
  children: React.ReactNode;
  
  /**
   * Fallback UI to render when an error occurs
   */
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  
  /**
   * Callback when an error is caught
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  
  /**
   * Context to include with error logs
   */
  context?: Record<string, any>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public static defaultProps: Partial<ErrorBoundaryProps> = {
    fallback: <h1>Something went wrong.</h1>,
    context: {},
  };

  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to our error tracking service
    logError(error, {
      ...this.props.context,
      componentStack: errorInfo.componentStack,
      boundary: 'ErrorBoundary',
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset the error state and re-render the children
   */
  public resetError = () => {
    this.setState({ 
      hasError: false,
      error: null,
    });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      // Render fallback UI
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error);
      }
      return this.props.fallback;
    }

    // Normally, just render children
    return this.props.children;
  }
}

/**
 * Higher-order component that wraps a component with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}

/**
 * Hook to wrap async functions with error handling
 */
export function useAsyncError() {
  const [, setError] = React.useState<Error | null>(null);
  
  const handleError = React.useCallback((error: unknown) => {
    const appError = error instanceof Error ? error : new Error(String(error));
    logError(appError, { hook: 'useAsyncError' });
    setError(() => {
      throw appError;
    });
  }, []);
  
  return { handleError };
}

/**
 * Hook to use error boundary state
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);
  
  const handleError = React.useCallback((error: Error) => {
    setError(error);
    logError(error, { hook: 'useErrorBoundary' });
  }, []);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  return { error, handleError, resetError };
}
