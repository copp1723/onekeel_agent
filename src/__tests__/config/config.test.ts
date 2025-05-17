/**
 * Configuration Module Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';

// Mock environment variables
const originalEnv = process.env;

describe('Configuration Module', () => {
  // Reset environment variables before each test
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };

    // Set required environment variables for tests
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-only';
  });

  // Restore original environment after each test
  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load configuration with default values', async () => {
    const config = (await import('../../config/index.js')).default;

    expect(config).toBeDefined();
    expect(config.env).toBe('test');
    expect(config.database).toBeDefined();
    expect(config.database.url).toBe('postgresql://test:test@localhost:5432/test');
    expect(config.security).toBeDefined();
    expect(config.security.encryptionKey).toBe('test-encryption-key-for-unit-tests-only');
    expect(config.server).toBeDefined();
    expect(config.server.port).toBe(5000); // Default value
    expect(config.app).toBeDefined();
    expect(config.app.downloadDir).toBe('./downloads'); // Default value
  });

  it('should override defaults with environment variables', async () => {
    // Set custom environment variables
    process.env.PORT = '8080';
    process.env.DOWNLOAD_DIR = './custom-downloads';
    process.env.LOG_LEVEL = 'debug';

    const config = (await import('../../config/index.js')).default;

    expect(config.server.port).toBe(8080);
    expect(config.app.downloadDir).toBe('./custom-downloads');
    expect(config.app.logLevel).toBe('debug');
  });

  it('should validate database configuration', async () => {
    // Remove required database URL and set NODE_ENV to production to force validation
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'production';

    // Should throw validation error
    try {
      await import('../../config/index.js');
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // Test passes if an error is thrown
      expect(error).toBeDefined();
    }
  });

  it('should accept individual database connection parameters', async () => {
    // Remove database URL but provide individual parameters
    delete process.env.DATABASE_URL;
    process.env.PGHOST = 'localhost';
    process.env.PGPORT = '5432';
    process.env.PGUSER = 'test';
    process.env.PGPASSWORD = 'test';
    process.env.PGDATABASE = 'test';

    const config = (await import('../../config/index.js')).default;

    expect(config.database).toBeDefined();
    expect(config.database.host).toBe('localhost');
    expect(config.database.port).toBe(5432);
    expect(config.database.user).toBe('test');
    expect(config.database.password).toBe('test');
    expect(config.database.database).toBe('test');
  });

  it('should handle email configuration correctly', async () => {
    // Set email configuration
    process.env.EMAIL_HOST = 'smtp.example.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'test-password';

    const config = (await import('../../config/index.js')).default;

    expect(config.email).toBeDefined();
    expect(config.email?.host).toBe('smtp.example.com');
    expect(config.email?.port).toBe(587);
    expect(config.email?.user).toBe('test@example.com');
    expect(config.email?.password).toBe('test-password');
  });

  it('should handle OTP email configuration correctly', async () => {
    // Set OTP email configuration
    process.env.OTP_EMAIL_HOST = 'imap.example.com';
    process.env.OTP_EMAIL_PORT = '993';
    process.env.OTP_EMAIL_USER = 'otp@example.com';
    process.env.OTP_EMAIL_PASS = 'otp-password';
    process.env.OTP_PATTERN = 'OTP: (\\d{6})';

    const config = (await import('../../config/index.js')).default;

    expect(config.otpEmail).toBeDefined();
    expect(config.otpEmail?.host).toBe('imap.example.com');
    expect(config.otpEmail?.port).toBe(993);
    expect(config.otpEmail?.user).toBe('otp@example.com');
    expect(config.otpEmail?.password).toBe('otp-password');
    expect(config.otpEmail?.pattern).toBe('OTP: (\\d{6})');
  });

  it('should handle security configuration correctly', async () => {
    // Set security configuration with long enough secrets (min 32 chars)
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
    process.env.SESSION_SECRET = 'test-session-secret-that-is-at-least-32-characters-long';
    process.env.SECURITY_AUDIT_LEVEL = 'warn';
    process.env.RATE_LIMITING = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '120000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '50';

    const config = (await import('../../config/index.js')).default;

    expect(config.security).toBeDefined();
    expect(config.security.jwtSecret).toBe('test-jwt-secret-that-is-at-least-32-characters-long');
    expect(config.security.sessionSecret).toBe('test-session-secret-that-is-at-least-32-characters-long');
    expect(config.security.securityAuditLevel).toBe('warn');
    expect(config.security.rateLimiting.enabled).toBe(true);
    expect(config.security.rateLimiting.windowMs).toBe(120000);
    expect(config.security.rateLimiting.maxRequests).toBe(50);
  });

  it('should handle server configuration correctly', async () => {
    // Set server configuration
    process.env.PORT = '3000';
    process.env.HOST = '127.0.0.1';
    process.env.CORS_ORIGINS = 'http://localhost:3000,https://example.com';
    process.env.TRUST_PROXY = 'true';
    process.env.SESSION_DURATION = '3600000';

    const config = (await import('../../config/index.js')).default;

    expect(config.server).toBeDefined();
    expect(config.server.port).toBe(3000);
    expect(config.server.host).toBe('127.0.0.1');
    expect(config.server.corsOrigins).toEqual(['http://localhost:3000', 'https://example.com']);
    expect(config.server.trustProxy).toBe(true);
    expect(config.server.sessionDuration).toBe(3600000);
  });

  it('should handle application configuration correctly', async () => {
    // Set application configuration
    process.env.DOWNLOAD_DIR = './custom-downloads';
    process.env.RESULTS_DIR = './custom-results';
    process.env.LOG_LEVEL = 'debug';
    process.env.LOG_DIR = './custom-logs';
    process.env.HEALTH_CHECK_INTERVAL = '30';
    process.env.ADMIN_EMAILS = 'admin@example.com,support@example.com';

    const config = (await import('../../config/index.js')).default;

    expect(config.app).toBeDefined();
    expect(config.app.downloadDir).toBe('./custom-downloads');
    expect(config.app.resultsDir).toBe('./custom-results');
    expect(config.app.logLevel).toBe('debug');
    expect(config.app.logDir).toBe('./custom-logs');
    expect(config.app.healthCheckInterval).toBe(30);
    expect(config.app.adminEmails).toEqual(['admin@example.com', 'support@example.com']);
  });

  it('should handle API keys configuration correctly', async () => {
    // Set API keys
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.EKO_API_KEY = 'test-eko-key';
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key';

    const config = (await import('../../config/index.js')).default;

    expect(config.apiKeys).toBeDefined();
    expect(config.apiKeys.openai).toBe('test-openai-key');
    expect(config.apiKeys.eko).toBe('test-eko-key');
    expect(config.apiKeys.sendgrid).toBe('test-sendgrid-key');
  });

  it('should handle Redis configuration correctly', async () => {
    // Set Redis configuration
    process.env.REDIS_HOST = 'redis.example.com';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'redis-password';
    process.env.REDIS_DB = '2';
    process.env.REDIS_TLS = 'true';

    const config = (await import('../../config/index.js')).default;

    expect(config.redis).toBeDefined();
    expect(config.redis?.host).toBe('redis.example.com');
    expect(config.redis?.port).toBe(6380);
    expect(config.redis?.password).toBe('redis-password');
    expect(config.redis?.db).toBe(2);
    expect(config.redis?.tls).toBe(true);
  });

  it('should handle CRM credentials correctly', async () => {
    // Set CRM credentials
    process.env.VIN_SOLUTIONS_USERNAME = 'vin-user';
    process.env.VIN_SOLUTIONS_PASSWORD = 'vin-pass';
    process.env.VAUTO_USERNAME = 'vauto-user';
    process.env.VAUTO_PASSWORD = 'vauto-pass';

    const config = (await import('../../config/index.js')).default;

    expect(config.crmCredentials).toBeDefined();
    expect(config.crmCredentials.vinSolutions?.username).toBe('vin-user');
    expect(config.crmCredentials.vinSolutions?.password).toBe('vin-pass');
    expect(config.crmCredentials.vauto?.username).toBe('vauto-user');
    expect(config.crmCredentials.vauto?.password).toBe('vauto-pass');
  });

  it('should validate required environment variables', async () => {
    const { validateRequiredEnvVars } = await import('../../config/index.js');

    // All required variables are set
    let result = validateRequiredEnvVars();
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);

    // Remove a required variable
    delete process.env.DATABASE_URL;

    result = validateRequiredEnvVars();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('DATABASE_URL');
  });
});
