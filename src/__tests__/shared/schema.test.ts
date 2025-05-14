import * as schema from '../../shared/schema.js';
import { describe, it, expect } from 'vitest';
describe('Database Schema', () => {
  it('should export all required tables', () => {
    // Check that all expected tables are exported
    expect(schema.users).toBeDefined();
    expect(schema.workflows).toBeDefined();
    expect(schema.tasks).toBeDefined();
    expect(schema.taskResults).toBeDefined();
    expect(schema.emailNotifications).toBeDefined();
    expect(schema.emails).toBeDefined();
    expect(schema.emailQueue).toBeDefined();
    expect(schema.apiKeys).toBeDefined();
    expect(schema.dealerCredentials).toBeDefined();
  });
  it('should export all required types', () => {
    // Check that all expected types are exported
    expect(schema.User).toBeDefined();
    expect(schema.UpsertUser).toBeDefined();
    expect(schema.Workflow).toBeDefined();
    expect(schema.UpsertWorkflow).toBeDefined();
    expect(schema.Task).toBeDefined();
    expect(schema.UpsertTask).toBeDefined();
    expect(schema.TaskResult).toBeDefined();
    expect(schema.UpsertTaskResult).toBeDefined();
    expect(schema.EmailNotification).toBeDefined();
    expect(schema.UpsertEmailNotification).toBeDefined();
    expect(schema.Email).toBeDefined();
    expect(schema.UpsertEmail).toBeDefined();
    expect(schema.EmailQueue).toBeDefined();
    expect(schema.UpsertEmailQueue).toBeDefined();
    expect(schema.ApiKey).toBeDefined();
    expect(schema.UpsertApiKey).toBeDefined();
    expect(schema.DealerCredential).toBeDefined();
    expect(schema.UpsertDealerCredential).toBeDefined();
  });
  it('should have correct primary keys for tables', () => {
    // Check that tables have the expected primary key
    expect(schema.users.id.primary).toBe(true);
    expect(schema.workflows.id.primary).toBe(true);
    expect(schema.tasks.id.primary).toBe(true);
    expect(schema.taskResults.id.primary).toBe(true);
    expect(schema.emailNotifications.id.primary).toBe(true);
    expect(schema.emails.id.primary).toBe(true);
    expect(schema.emailQueue.id.primary).toBe(true);
    expect(schema.apiKeys.id.primary).toBe(true);
    expect(schema.dealerCredentials.id.primary).toBe(true);
  });
  it('should have correct foreign key relationships', () => {
    // Check that foreign keys reference the correct tables
    expect(schema.tasks.workflowId!.references).toBeDefined();
    expect(schema.taskResults.taskId.references).toBeDefined();
    expect(schema.emailNotifications.workflowId!.references).toBeDefined();
    expect(schema.emails.workflowId!.references).toBeDefined();
    expect(schema.dealerCredentials.userId!.references).toBeDefined();
  });
});
