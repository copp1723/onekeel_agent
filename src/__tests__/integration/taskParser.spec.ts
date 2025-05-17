import { describe, it, expect, afterAll } from '....js';
import parseTask from '../../services/taskParser.js';
import { db } from '../../shared/db.js';
import { tasks } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { EmailRequest, TaskResult } from '../../types.js';
describe('Task Parser Integration Tests', () => {
  // Test data
  const testTasks = [
    {
      input: 'Generate a report for Q1 sales',
      expected: {
        type: 'report',
        parameters: {
          period: 'Q1',
          metric: 'sales',
        },
      },
    },
    {
      input: 'Send weekly newsletter to marketing team',
      expected: {
        type: 'email',
        parameters: {
          frequency: 'weekly',
          template: 'newsletter',
          recipients: 'marketing team',
        },
      },
    },
    {
      input: 'Schedule a meeting with the product team on Friday at 2pm',
      expected: {
        type: 'meeting',
        parameters: {
          attendees: 'product team',
          day: 'Friday',
          time: '2pm',
        },
      },
    },
  ];
  // Clean up test data after tests
  afterAll(async () => {
    for (const task of testTasks) {
      await db.delete(tasks).where(eq(tasks.description, task.input));
    }
  });
  describe('Task Parsing', () => {
    it('should parse natural language tasks into structured data', async () => {
      for (const task of testTasks) {
        const result = await parseTask(task.input);
        // Check that the task was parsed correctly
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.description).toBe(task.input);
        // Check that the task was saved to the database
        const [savedTask] = await db.select().from(tasks).where(eq(tasks.id, result.id));
        expect(savedTask).toBeDefined();
        expect(savedTask.description).toBe(task.input);
        // Check that the parsed data matches the expected structure
        const parsedData = JSON.parse(savedTask.parsedData);
        expect(parsedData.type).toBe(task.expected.type);
        // Check that all expected parameters are present
        for (const [key, value] of Object.entries(task.expected.parameters)) {
          expect(parsedData.parameters[key]).toBe(value);
        }
      }
    });
    it('should handle complex tasks with multiple parameters', async () => {
      const complexTask =
        'Generate a monthly sales report for the East region comparing Q1 2023 vs Q1 2022 and send it to the sales team';
      const result = await parseTask(complexTask);
      // Check that the task was parsed correctly
      expect(result).toBeDefined();
      expect(result.description).toBe(complexTask);
      // Check that the task was saved to the database
      const [savedTask] = await db.select().from(tasks).where(eq(tasks.id, result.id));
      expect(savedTask).toBeDefined();
      // Check that the parsed data has the expected structure
      const parsedData = JSON.parse(savedTask.parsedData);
      expect(parsedData.type).toBe('report');
      expect(parsedData.parameters).toHaveProperty('frequency', 'monthly');
      expect(parsedData.parameters).toHaveProperty('metric', 'sales');
      expect(parsedData.parameters).toHaveProperty('region', 'East');
      expect(parsedData.parameters).toHaveProperty('comparison', expect.stringContaining('Q1'));
      expect(parsedData.parameters).toHaveProperty('recipients', 'sales team');
      // Clean up
      await db.delete(tasks).where(eq(tasks.id, result.id));
    });
    it('should handle tasks with missing or ambiguous parameters', async () => {
      const ambiguousTask = 'Send a report';
      const result = await parseTask(ambiguousTask);
      // Check that the task was parsed correctly despite ambiguity
      expect(result).toBeDefined();
      expect(result.description).toBe(ambiguousTask);
      // Check that the task was saved to the database
      const [savedTask] = await db.select().from(tasks).where(eq(tasks.id, result.id));
      expect(savedTask).toBeDefined();
      // Check that the parsed data has at least a type
      const parsedData = JSON.parse(savedTask.parsedData);
      expect(parsedData.type).toBeDefined();
      expect(parsedData.parameters).toBeDefined();
      // Clean up
      await db.delete(tasks).where(eq(tasks.id, result.id));
    });
  });
});
describe('taskParser', () => {
  it('should parse email tasks correctly', () => {
    const emailRequest: EmailRequest = {
      subject: 'Report Request',
      from: 'user@example.com',
      to: 'system@example.com',
      text: 'Please generate an inventory report',
      date: new Date(),
      attachments: [],
    };
    const result: TaskResult = parseTask(emailRequest);
    expect(result).toMatchObject({
      type: 'report',
      intent: 'inventory',
      source: 'email',
      metadata: expect.any(Object),
    });
  });
  it('should extract metadata from complex tasks', () => {
    const emailRequest: EmailRequest = {
      subject: 'Weekly Inventory Analysis',
      from: 'manager@example.com',
      to: 'system@example.com',
      text: 'Generate inventory aging report with 90+ day focus',
      date: new Date(),
      attachments: [],
    };
    const result: TaskResult = parseTask(emailRequest);
    expect(result).toMatchObject({
      type: 'report',
      intent: 'inventory_aging',
      source: 'email',
      metadata: {
        focus: '90+',
        frequency: 'weekly',
      },
    });
  });
  it('should handle invalid or malformed requests', () => {
    const emailRequest: EmailRequest = {
      subject: '',
      from: 'user@example.com',
      to: 'system@example.com',
      text: '',
      date: new Date(),
      attachments: [],
    };
    expect(() => parseTask(emailRequest)).toThrow('Invalid task request');
  });
});
