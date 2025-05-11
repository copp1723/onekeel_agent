import { db } from './dist/shared/db.js';
import { plans, steps, taskLogs } from './dist/shared/schema.js';

async function queryDatabase() {
  try {
    console.log('Querying plans table...');
    const plansResult = await db.select().from(plans);
    console.log('Plans:', JSON.stringify(plansResult, null, 2));

    console.log('\nQuerying steps table...');
    const stepsResult = await db.select().from(steps);
    console.log('Steps:', JSON.stringify(stepsResult, null, 2));

    console.log('\nQuerying task_logs table...');
    const logsResult = await db.select().from(taskLogs);
    console.log('Task Logs:', JSON.stringify(logsResult, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  }
}

queryDatabase();