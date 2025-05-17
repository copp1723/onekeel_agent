/**
 * Tests for the retry utility
 *
 * These tests verify the behavior of the retry utility under various conditions,
 * including successful operations, transient failures, and permanent failures.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retry, retryWithResult, retryable } from '....js';
// Mock the logger to avoid console output during tests
vi.mock('../../shared/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
describe('retry utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('retry function', () => {
    it('should return the result if the operation succeeds on the first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
    it('should retry the operation if it fails temporarily', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('temporary error'))
        .mockResolvedValueOnce('success');
      const result = await retry(fn, { retries: 1, minTimeout: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
    it('should throw the last error if all retries fail', async () => {
      const error = new Error('persistent error');
      const fn = vi.fn().mockRejectedValue(error);
      await expect(retry(fn, { retries: 2, minTimeout: 10 })).rejects.toThrow('persistent error');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
    it('should respect the retryIf option', async () => {
      const retryableError = new Error('retryable');
      const nonRetryableError = new Error('non-retryable');
      const fn = vi
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(nonRetryableError);
      const retryIf = (error: any) =>
        (error instanceof Error
          ? error instanceof Error
            ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
            : String(error)
          : String(error)) === 'retryable';
      await expect(retry(fn, { retries: 2, minTimeout: 10, retryIf })).rejects.toThrow(
        'non-retryable'
      );
      expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry (second error not retried)
    });
    it('should call onRetry for each retry attempt', async () => {
      const error1 = new Error('error 1');
      const error2 = new Error('error 2');
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce('success');
      const onRetry = vi.fn();
      const result = await retry(fn, { retries: 2, minTimeout: 10, onRetry });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, error1, 1);
      expect(onRetry).toHaveBeenNthCalledWith(2, error2, 2);
    });
    it('should respect maxRetryTime', async () => {
      vi.useFakeTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockImplementationOnce(() => {
          vi.advanceTimersByTime(1000); // Advance time by 1 second
          return Promise.reject(new Error('error 2'));
        })
        .mockResolvedValueOnce('success');
      const retryPromise = retry(fn, {
        retries: 3,
        minTimeout: 10,
        maxRetryTime: 500, // Only allow 500ms total retry time
      });
      // Advance timers to allow the first retry to happen
      vi.advanceTimersByTime(10);
      await expect(retryPromise).rejects.toThrow('error 2');
      expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry (second retry exceeds maxRetryTime)
      vi.useRealTimers();
    });
  });
  describe('retryWithResult function', () => {
    it('should return success result with metadata on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retryWithResult(fn);
      expect(result).toEqual({
        result: 'success',
        attempts: 1,
        success: true,
        totalTime: expect.any(Number),
      });
    });
    it('should return error result with metadata on failure', async () => {
      const error = new Error('persistent error');
      const fn = vi.fn().mockRejectedValue(error);
      const result = await retryWithResult(fn, { retries: 1, minTimeout: 10 });
      expect(result).toEqual({
        error,
        attempts: 2,
        success: false,
        totalTime: expect.any(Number),
      });
    });
  });
  describe('retryable function', () => {
    it('should create a retryable version of a function', async () => {
      const mockFn = vi.fn().mockImplementation((x: number) => {
        if (x < 0) {
          return Promise.reject(new Error('negative number'));
        }
        return Promise.resolve(x * 2);
      });
      const retryableFn = retryable(mockFn, { retries: 2, minTimeout: 10 });
      // Should succeed without retries
      expect(await retryableFn(5)).toBe(10);
      expect(mockFn).toHaveBeenCalledTimes(1);
      mockFn.mockClear();
      // Should fail after retries
      await expect(retryableFn(-1)).rejects.toThrow('negative number');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});
