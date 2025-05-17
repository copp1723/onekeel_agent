/**
 * Tests for the circuit breaker utility
 *
 * These tests verify the behavior of the circuit breaker under various conditions,
 * including successful operations, transient failures, and permanent failures.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitState, CircuitOpenError } from '../../../src/src/../src/../utils/circuitBreaker.js';
// Mock the database and logger
vi.mock('../../shared/db.js', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));
vi.mock('../../shared/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('execute method', () => {
    it('should execute the function and return its result when circuit is closed', async () => {
      const circuitBreaker = new CircuitBreaker('test-circuit', { inMemory: true });
      const fn = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
    it('should throw CircuitOpenError when circuit is open', async () => {
      const circuitBreaker = new CircuitBreaker('test-open-circuit', {
        inMemory: true,
        failureThreshold: 1,
      });
      // Force the circuit to open
      const failingFn = vi.fn().mockRejectedValue(new Error('failure'));
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow('failure');
      // Now the circuit should be open
      const fn = vi.fn().mockResolvedValue('success');
      await expect(circuitBreaker.execute(fn)).rejects.toThrow(CircuitOpenError);
      expect(fn).not.toHaveBeenCalled();
    });
    it('should transition from open to half-open after resetTimeout', async () => {
      vi.useFakeTimers();
      const resetTimeout = 1000; // 1 second
      const circuitBreaker = new CircuitBreaker('test-reset-circuit', {
        inMemory: true,
        failureThreshold: 1,
        resetTimeout,
      });
      // Force the circuit to open
      const failingFn = vi.fn().mockRejectedValue(new Error('failure'));
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow('failure');
      // Advance time past the resetTimeout
      vi.advanceTimersByTime(resetTimeout + 100);
      // The next call should put the circuit in half-open state
      const fn = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(await circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      vi.useRealTimers();
    });
    it('should transition from half-open to closed after successThreshold successes', async () => {
      const circuitBreaker = new CircuitBreaker('test-success-circuit', {
        inMemory: true,
        successThreshold: 2,
      });
      // Set the circuit to half-open state
      await circuitBreaker['transitionTo'](CircuitState.HALF_OPEN);
      // First successful call in half-open state
      const fn1 = vi.fn().mockResolvedValue('success1');
      await circuitBreaker.execute(fn1);
      // Circuit should still be half-open
      expect(await circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      // Second successful call in half-open state
      const fn2 = vi.fn().mockResolvedValue('success2');
      await circuitBreaker.execute(fn2);
      // Circuit should now be closed
      expect(await circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
    it('should transition from half-open to open on failure', async () => {
      const circuitBreaker = new CircuitBreaker('test-half-open-failure', {
        inMemory: true,
      });
      // Set the circuit to half-open state
      await circuitBreaker['transitionTo'](CircuitState.HALF_OPEN);
      // Failing call in half-open state
      const fn = vi.fn().mockRejectedValue(new Error('failure'));
      await expect(circuitBreaker.execute(fn)).rejects.toThrow('failure');
      // Circuit should now be open
      expect(await circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
    it('should call onStateChange when state changes', async () => {
      const onStateChange = vi.fn();
      const circuitBreaker = new CircuitBreaker('test-state-change', {
        inMemory: true,
        failureThreshold: 1,
        onStateChange,
      });
      // Force the circuit to open
      const failingFn = vi.fn().mockRejectedValue(new Error('failure'));
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow('failure');
      expect(onStateChange).toHaveBeenCalledWith(CircuitState.CLOSED, CircuitState.OPEN);
    });
    it('should respect the isFailure option', async () => {
      const circuitBreaker = new CircuitBreaker('test-is-failure', {
        inMemory: true,
        failureThreshold: 2,
        isFailure: (error) =>
          (error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)) === 'count-me',
      });
      // This error should not count towards the failure threshold
      const ignoredFn = vi.fn().mockRejectedValue(new Error('ignore-me'));
      await expect(circuitBreaker.execute(ignoredFn)).rejects.toThrow('ignore-me');
      // Circuit should still be closed
      expect(await circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      // These errors should count towards the failure threshold
      const countedFn = vi.fn().mockRejectedValue(new Error('count-me'));
      await expect(circuitBreaker.execute(countedFn)).rejects.toThrow('count-me');
      await expect(circuitBreaker.execute(countedFn)).rejects.toThrow('count-me');
      // Circuit should now be open
      expect(await circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
    it('should timeout if the function takes too long', async () => {
      vi.useFakeTimers();
      const circuitBreaker = new CircuitBreaker('test-timeout', {
        inMemory: true,
        timeout: 100,
      });
      const slowFn = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('too late'), 200);
        });
      });
      const executePromise = circuitBreaker.execute(slowFn);
      // Advance time past the timeout
      vi.advanceTimersByTime(150);
      await expect(executePromise).rejects.toThrow('timed out');
      vi.useRealTimers();
    });
  });
  describe('reset method', () => {
    it('should reset the circuit to closed state', async () => {
      const circuitBreaker = new CircuitBreaker('test-reset', {
        inMemory: true,
        failureThreshold: 1,
      });
      // Force the circuit to open
      const failingFn = vi.fn().mockRejectedValue(new Error('failure'));
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow('failure');
      // Circuit should be open
      expect(await circuitBreaker.getState()).toBe(CircuitState.OPEN);
      // Reset the circuit
      await circuitBreaker.reset();
      // Circuit should now be closed
      expect(await circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
});
