/**
 * Integration tests for the retry and circuit breaker patterns
 * 
 * These tests verify the behavior of the retry and circuit breaker patterns
 * when used together in realistic scenarios.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retry } from '../../utils/retry.js.js';
import { CircuitBreaker, CircuitState } from '../../utils/circuitBreaker.js.js';
// Mock the database and logger
vi.mock('../../shared/db.js', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [] })
  }
}));
vi.mock('../../shared/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));
describe('Retry and Circuit Breaker Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should handle transient failures with retry and circuit breaker', async () => {
    // Create a circuit breaker with in-memory state
    const circuitBreaker = new CircuitBreaker('test-integration', { 
      inMemory: true,
      failureThreshold: 3
    });
    // Create a function that fails twice then succeeds
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('failure 1'))
      .mockRejectedValueOnce(new Error('failure 2'))
      .mockResolvedValue('success');
    // Use circuit breaker and retry together
    const result = await circuitBreaker.execute(async () => {
      return retry(mockFn, { retries: 2, minTimeout: 10 });
    });
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
    // Circuit should still be closed because the operation eventually succeeded
    expect(await circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });
  it('should open circuit after persistent failures despite retries', async () => {
    // Create a circuit breaker with in-memory state
    const circuitBreaker = new CircuitBreaker('test-integration-failure', { 
      inMemory: true,
      failureThreshold: 1
    });
    // Create a function that always fails
    const mockFn = vi.fn().mockRejectedValue(new Error('persistent failure'));
    // Use circuit breaker and retry together
    await expect(circuitBreaker.execute(async () => {
      return retry(mockFn, { retries: 2, minTimeout: 10 });
    })).rejects.toThrow('persistent failure');
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    // Circuit should be open after persistent failures
    expect(await circuitBreaker.getState()).toBe(CircuitState.OPEN);
    // Further calls should fail fast with CircuitOpenError
    const anotherFn = vi.fn().mockResolvedValue('success');
    await expect(circuitBreaker.execute(anotherFn))
      .rejects.toThrow('Circuit test-integration-failure is OPEN');
    expect(anotherFn).not.toHaveBeenCalled();
  });
  it('should handle multiple services with separate circuit breakers', async () => {
    // Create circuit breakers for two different services
    const serviceACircuit = new CircuitBreaker('service-a', { 
      inMemory: true,
      failureThreshold: 1
    });
    const serviceBCircuit = new CircuitBreaker('service-b', { 
      inMemory: true,
      failureThreshold: 1
    });
    // Service A always fails
    const serviceA = vi.fn().mockRejectedValue(new Error('service A failure'));
    // Service B always succeeds
    const serviceB = vi.fn().mockResolvedValue('service B success');
    // Call service A with its circuit breaker
    await expect(serviceACircuit.execute(async () => {
      return retry(serviceA, { retries: 1, minTimeout: 10 });
    })).rejects.toThrow('service A failure');
    // Service A's circuit should be open
    expect(await serviceACircuit.getState()).toBe(CircuitState.OPEN);
    // Call service B with its circuit breaker
    const resultB = await serviceBCircuit.execute(async () => {
      return retry(serviceB, { retries: 1, minTimeout: 10 });
    });
    expect(resultB).toBe('service B success');
    // Service B's circuit should still be closed
    expect(await serviceBCircuit.getState()).toBe(CircuitState.CLOSED);
    // Further calls to service A should fail fast
    await expect(serviceACircuit.execute(serviceA))
      .rejects.toThrow('Circuit service-a is OPEN');
    // But service B should still work
    const anotherResultB = await serviceBCircuit.execute(serviceB);
    expect(anotherResultB).toBe('service B success');
  });
  it('should transition through all circuit states correctly', async () => {
    vi.useFakeTimers();
    // Create a circuit breaker with short reset timeout
    const circuitBreaker = new CircuitBreaker('test-state-transitions', { 
      inMemory: true,
      failureThreshold: 1,
      resetTimeout: 1000, // 1 second
      successThreshold: 1
    });
    // Initially the circuit should be closed
    expect(await circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    // Force the circuit to open with a failing function
    const failingFn = vi.fn().mockRejectedValue(new Error('failure'));
    await expect(circuitBreaker.execute(failingFn)).rejects.toThrow('failure');
    // Circuit should now be open
    expect(await circuitBreaker.getState()).toBe(CircuitState.OPEN);
    // Advance time past the reset timeout
    vi.advanceTimersByTime(1100);
    // The next call should put the circuit in half-open state and succeed
    const successFn = vi.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(successFn);
    expect(result).toBe('success');
    // After a successful call in half-open state, the circuit should be closed
    expect(await circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    vi.useRealTimers();
  });
  it('should handle realistic API call scenario', async () => {
    // Create a mock API client
    const apiClient = {
      get: vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ data: { id: 1, name: 'Test' } })
    };
    // Create a circuit breaker for the API
    const apiCircuit = new CircuitBreaker('api-client', { 
      inMemory: true,
      failureThreshold: 3,
      timeout: 500
    });
    // Create a function to get a user by ID with retry and circuit breaker
    async function getUserById(id: number) {
      return apiCircuit.execute(async () => {
        return retry(
          async () => {
            const response = await apiClient.get(`/users/${id}`);
            return response.data;
          },
          { 
            retries: 2, 
            minTimeout: 100,
            factor: 2,
            jitter: true
          }
        );
      });
    }
    // Call the function
    const user = await getUserById(1);
    // Should eventually succeed after retries
    expect(user).toEqual({ id: 1, name: 'Test' });
    expect(apiClient.get).toHaveBeenCalledTimes(3);
    // Circuit should still be closed
    expect(await apiCircuit.getState()).toBe(CircuitState.CLOSED);
  });
});
