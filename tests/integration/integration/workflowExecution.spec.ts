import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../src/src/../src/../shared/db.js';
import { workflows, workflowSteps, workflowResults } from '../../../src/src/../src/../shared/schema.js';
import { eq } from 'drizzle-orm';
import { executeWorkflow } from '../../../src/src/../src/../services/workflowExecutor.js';
// Mock any external services that we don't want to actually call during tests
vi.mock('../../services/mailerService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
}));
describe('Workflow Execution Integration Tests', () => {
  // Test workflow data
  const testWorkflowId = uuidv4();
  const testUserId = 'test-user-id';
  // Set up test workflow
  beforeAll(async () => {
    // Create a test workflow
    await db.insert(workflows).values({
      id: testWorkflowId,
      name: 'Test Workflow',
      description: 'A test workflow for integration testing',
      userId: testUserId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any); // @ts-ignore - Ensuring all required properties are provided as any // @ts-ignore - Type issues with Drizzle insert in tests;
    // Create workflow steps
    await db.insert(workflowSteps).values([
      {
        id: uuidv4(),
        workflowId: testWorkflowId,
        name: 'Step 1',
        type: 'data_fetch',
        config: JSON.stringify({
          source: 'test_data',
          query: 'SELECT * FROM test_table',
        }),
        order: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        workflowId: testWorkflowId,
        name: 'Step 2',
        type: 'data_transform',
        config: JSON.stringify({
          operation: 'filter',
          condition: 'value > 10',
        }),
        order: 2,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        workflowId: testWorkflowId,
        name: 'Step 3',
        type: 'notification',
        config: JSON.stringify({
          method: 'email',
          recipient: 'test@example.com',
          template: 'workflow_complete',
        }),
        order: 3,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });
  // Clean up test data after tests
  afterAll(async () => {
    await db.delete(workflowResults).where(eq(workflowResults.workflowId!, testWorkflowId));
    await db.delete(workflowSteps).where(eq(workflowSteps.workflowId!, testWorkflowId));
    await db.delete(workflows).where(eq(workflows.id, testWorkflowId.toString()));
  });
  describe('Workflow Execution', () => {
    it('should execute a workflow with multiple steps', async () => {
      // Execute the workflow
      const result = await executeWorkflow(testWorkflowId);
      // Check that the workflow execution was successful
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.workflowId!).toBe(testWorkflowId);
      // Check that the workflow status was updated
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, testWorkflowId.toString()));
      expect(workflow).toBeDefined();
      expect(workflow.status).toBe('completed');
      // Check that all steps were executed
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId!, testWorkflowId))
        .orderBy(workflowSteps.order);
      expect(steps).toHaveLength(3);
      expect(steps[0].status).toBe('completed');
      expect(steps[1].status).toBe('completed');
      expect(steps[2].status).toBe('completed');
      // Check that workflow results were saved
      const [workflowResult] = await db
        .select()
        .from(workflowResults)
        .where(eq(workflowResults.workflowId!, testWorkflowId));
      expect(workflowResult).toBeDefined();
      expect(workflowResult.success).toBe(true);
      expect(JSON.parse(workflowResult.results)).toHaveProperty('steps');
      expect(JSON.parse(workflowResult.results).steps).toHaveLength(3);
    });
    it('should handle workflow step failures gracefully', async () => {
      // Create a workflow with a failing step
      const failingWorkflowId = uuidv4();
      await db.insert(workflows).values({
        id: failingWorkflowId,
        name: 'Failing Workflow',
        description: 'A workflow with a failing step',
        userId: testUserId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any); // @ts-ignore - Ensuring all required properties are provided as any // @ts-ignore - Type issues with Drizzle insert in tests;
      await db.insert(workflowSteps).values([
        {
          id: uuidv4(),
          workflowId: failingWorkflowId,
          name: 'Failing Step',
          type: 'data_fetch',
          config: JSON.stringify({
            source: 'invalid_source',
            query: 'INVALID QUERY',
          }),
          order: 1,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      // Execute the workflow
      const result = await executeWorkflow(failingWorkflowId);
      // Check that the workflow execution failed
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.workflowId!).toBe(failingWorkflowId);
      expect(result.error).toBeDefined();
      // Check that the workflow status was updated
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, failingWorkflowId.toString()));
      expect(workflow).toBeDefined();
      expect(workflow.status).toBe('failed');
      // Check that the step status was updated
      const [step] = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId!, failingWorkflowId));
      expect(step).toBeDefined();
      expect(step.status).toBe('failed');
      // Clean up
      await db.delete(workflowResults).where(eq(workflowResults.workflowId!, failingWorkflowId));
      await db.delete(workflowSteps).where(eq(workflowSteps.workflowId!, failingWorkflowId));
      await db.delete(workflows).where(eq(workflows.id, failingWorkflowId.toString()));
    });
  });
});
