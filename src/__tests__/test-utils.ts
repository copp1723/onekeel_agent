import type { Mock } from 'vitest';

/**
 * Type-safe mock for process.env
 */
export const mockProcessEnv = (env: Record<string, string | undefined>): void => {
  process.env = {
    ...process.env,
    ...env,
  };
};

/**
 * Resets all mocks and restores their original implementations
 */
export const resetAllMocks = (): void => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
};

/**
 * Helper to mock a successful API response
 */
export const mockSuccessfulApiResponse = <T>(data: T, mockFn: Mock): void => {
  mockFn.mockResolvedValueOnce({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  });
};

/**
 * Helper to mock a failed API response
 */
export const mockFailedApiResponse = (
  error: any,
  status = 500,
  mockFn: Mock
): void => {
  mockFn.mockRejectedValueOnce({
    response: {
      data: error,
      status,
      statusText: 'Error',
      headers: {},
      config: {},
    },
  });
};

/**
 * Helper to wait for all promises to resolve
 */
export const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Helper to create a mock function with proper TypeScript typing
 */
export function createMock<T extends (...args: any[]) => any>(
  implementation: T = (() => {}) as T
): Mock<Parameters<T>, ReturnType<T>> {
  return vi.fn(implementation) as unknown as Mock<Parameters<T>, ReturnType<T>>;
}

/**
 * Helper to mock the current date for testing time-dependent code
 */
export const mockCurrentDate = (date: Date | string | number): void => {
  const mockDate = new Date(date);
  vi.useFakeTimers();
  vi.setSystemTime(mockDate);
};

/**
 * Restore the real date implementation
 */
export const restoreDate = (): void => {
  vi.useRealTimers();
};
