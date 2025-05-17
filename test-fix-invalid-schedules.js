// Tests for fix-invalid-schedules.js error handling and config validation
import { validateCronExpression, validateCronField } from './fix-invalid-schedules.js';
import assert from 'assert';

function testValidateCronExpression() {
  // Valid cron expressions
  assert.strictEqual(validateCronExpression('0 0 * * *'), true, 'Standard cron should be valid');
  assert.strictEqual(validateCronExpression('*/5 9-17 * * 1-5'), true, 'Step and range should be valid');
  assert.strictEqual(validateCronExpression('15 14 1 * *'), true, 'Specific time should be valid');
  assert.strictEqual(validateCronExpression('* * * * *'), true, 'All wildcards should be valid');
  assert.strictEqual(validateCronExpression('0 0 1 1 *'), true, 'Yearly cron should be valid');

  // Invalid cron expressions
  assert.strictEqual(validateCronExpression(''), false, 'Empty string should be invalid');
  assert.strictEqual(validateCronExpression('bad cron'), false, 'Non-cron string should be invalid');
  assert.strictEqual(validateCronExpression('60 0 * * *'), false, 'Minute out of range');
  assert.strictEqual(validateCronExpression('0 24 * * *'), false, 'Hour out of range');
  assert.strictEqual(validateCronExpression('0 0 0 * *'), false, 'Day of month out of range');
  assert.strictEqual(validateCronExpression('0 0 * 13 *'), false, 'Month out of range');
  assert.strictEqual(validateCronExpression('0 0 * * 7'), false, 'Day of week out of range');
  assert.strictEqual(validateCronExpression('0 0 *'), false, 'Too few fields');
  assert.strictEqual(validateCronExpression('0 0 * * * *'), false, 'Too many fields');
}

function testValidateCronField() {
  // Valid fields
  assert.strictEqual(validateCronField('*', 0, 59), true);
  assert.strictEqual(validateCronField('5', 0, 59), true);
  assert.strictEqual(validateCronField('0-10', 0, 59), true);
  assert.strictEqual(validateCronField('*/15', 0, 59), true);
  assert.strictEqual(validateCronField('5,10,15', 0, 59), true);

  // Invalid fields
  assert.strictEqual(validateCronField('60', 0, 59), false);
  assert.strictEqual(validateCronField('10-5', 0, 59), false);
  assert.strictEqual(validateCronField('*/0', 0, 59), false);
  assert.strictEqual(validateCronField('a', 0, 59), false);
  assert.strictEqual(validateCronField('5,100', 0, 59), false);
}

function runAllTests() {
  try {
    testValidateCronExpression();
    testValidateCronField();
    console.log('All fix-invalid-schedules tests passed.');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runAllTests();
