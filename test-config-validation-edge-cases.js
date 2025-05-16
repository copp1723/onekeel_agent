// Tests for configuration validation edge cases
import assert from 'assert';
import { getIMAPConfig } from './src/agents/ingestScheduledReport.js';

function testIMAPConfigValidation() {
  // Backup env
  const oldEnv = { ...process.env };

  // Missing all
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  delete process.env.EMAIL_HOST;
  try {
    getIMAPConfig();
    assert.fail('Should throw on missing config');
  } catch (e) {
    assert.ok(e.message.includes('Missing required email configuration'));
  }

  // Only user
  process.env.EMAIL_USER = 'user';
  try {
    getIMAPConfig();
    assert.fail('Should throw on missing config');
  } catch (e) {
    assert.ok(e.message.includes('Missing required email configuration'));
  }

  // All present
  process.env.EMAIL_USER = 'user';
  process.env.EMAIL_PASS = 'pass';
  process.env.EMAIL_HOST = 'host';
  process.env.EMAIL_PORT = '993';
  process.env.EMAIL_TLS = 'true';
  const config = getIMAPConfig();
  assert.strictEqual(config.user, 'user');
  assert.strictEqual(config.password, 'pass');
  assert.strictEqual(config.host, 'host');
  assert.strictEqual(config.port, 993);
  assert.strictEqual(config.tls, true);

  // Restore env
  process.env = oldEnv;
  console.log('IMAP config validation edge case tests passed.');
}

testIMAPConfigValidation();
