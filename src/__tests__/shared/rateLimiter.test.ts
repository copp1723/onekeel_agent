/**
 * Tests for the rate limiting middleware
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter, rateLimiters } from '../../shared/middleware/rateLimiter.js';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';

// Mock the logger to avoid actual logging during tests
vi.mock('../../shared/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Rate Limiter Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a rate limiter with default settings', () => {
    const limiter = createRateLimiter();
    expect(limiter).toBeDefined();
  });

  it('should create a rate limiter with custom settings', () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 5,
      message: 'Custom message'
    });
    expect(limiter).toBeDefined();
  });

  it('should allow requests within the rate limit', async () => {
    // Create a test-specific limiter with high limits
    const testLimiter = createRateLimiter({
      windowMs: 1000,
      max: 10
    });

    // Apply the limiter to a test endpoint
    app.get('/test', testLimiter, (_req: Request, res: Response) => {
      res.status(200).json({ message: 'Success' });
    });

    // Make a request that should be allowed
    const response = await request(app).get('/test');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Success' });
  });

  it('should block requests that exceed the rate limit', async () => {
    // Create a test-specific limiter with very low limits
    const testLimiter = createRateLimiter({
      windowMs: 1000,
      max: 1, // Only allow 1 request per second
      message: 'Test rate limit exceeded'
    });

    // Apply the limiter to a test endpoint
    app.get('/test-limit', testLimiter, (_req: Request, res: Response) => {
      res.status(200).json({ message: 'Success' });
    });

    // First request should succeed
    const response1 = await request(app).get('/test-limit');
    expect(response1.status).toBe(200);

    // Second request should be rate limited
    const response2 = await request(app).get('/test-limit');
    expect(response2.status).toBe(429);
    expect(response2.body.message).toBe('Test rate limit exceeded');
  });

  it('should include rate limit headers in the response', async () => {
    // Create a test-specific limiter
    const testLimiter = createRateLimiter({
      windowMs: 1000,
      max: 5
    });

    // Apply the limiter to a test endpoint
    app.get('/test-headers', testLimiter, (_req: Request, res: Response) => {
      res.status(200).json({ message: 'Success' });
    });

    // Make a request and check for rate limit headers
    const response = await request(app).get('/test-headers');
    expect(response.status).toBe(200);
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    expect(response.headers).toHaveProperty('x-ratelimit-reset');
  });

  it('should have predefined rate limiters available', () => {
    expect(rateLimiters.api).toBeDefined();
    expect(rateLimiters.auth).toBeDefined();
    expect(rateLimiters.taskSubmission).toBeDefined();
    expect(rateLimiters.healthCheck).toBeDefined();
  });
});
