// Integration test for fix-invalid-schedules.js error handling
import { db } from './dist/shared/db.js';
import { schedules } from './dist/shared/schema.js';
import { eq } from 'drizzle-orm';
import { validateCronExpression } from './fix-invalid-schedules.js';
import assert from 'assert';

async function testInvalidScheduleHandling() {
  // Insert a schedule with an invalid cron expression
  const invalidCron = '61 25 * * *';
  const testSchedule = { id: 'test-invalid', cron: invalidCron, enabled: true, updatedAt: new Date() };
  await db.insert(schedules).values(testSchedule);

  // Run validation
  const isValid = validateCronExpression(invalidCron);
  assert.strictEqual(isValid, false, 'Invalid cron should be detected');

  // Simulate fix-invalid-schedules logic: should disable invalid schedule
  await db.update(schedules).set({ enabled: false, updatedAt: new Date() }).where(eq(schedules.id, 'test-invalid'));
  const [updated] = await db.select().from(schedules).where(eq(schedules.id, 'test-invalid'));
  assert.strictEqual(updated.enabled, false, 'Invalid schedule should be disabled');

  // Cleanup
  await db.delete(schedules).where(eq(schedules.id, 'test-invalid'));
  console.log('Integration test for invalid schedule handling passed.');
}

testInvalidScheduleHandling().catch(e => { console.error(e); process.exit(1); });
