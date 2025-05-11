import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// Define database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function testDbLogging() {
  console.log('Testing database logging functionality...');
  
  try {
    // Step 1: Examine the structure of the task_logs table
    console.log('Checking task_logs table structure...');
    const tableSchema = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'task_logs'
    `);
    
    console.log('task_logs table schema:');
    for (const column of tableSchema) {
      console.log(`  ${column.column_name}: ${column.data_type}`);
    }
    
    // Step 2: Create a test user if needed
    let testUserId = null;
    const testEmail = 'test@example.com';
    
    const existingUsers = await db.execute(sql`
      SELECT id FROM users WHERE email = ${testEmail}
    `);
    
    if (existingUsers.length === 0) {
      console.log('Creating test user...');
      const newUser = await db.execute(sql`
        INSERT INTO users (id, email, first_name, last_name)
        VALUES ('test-user-id', ${testEmail}, 'Test', 'User')
        RETURNING id
      `);
      testUserId = newUser[0].id;
      console.log(`Created test user with ID: ${testUserId}`);
    } else {
      testUserId = existingUsers[0].id;
      console.log(`Using existing test user with ID: ${testUserId}`);
    }
    
    // Step 3: Insert a test task log
    console.log('Inserting test task log...');
    const taskLog = await db.execute(sql`
      INSERT INTO task_logs (user_input, tool, status, output, user_id)
      VALUES (
        'Test task',
        'test_tool',
        'success',
        ${'{"result": "This is a test"}'::jsonb},
        ${testUserId}
      )
      RETURNING id
    `);
    
    const taskLogId = taskLog[0].id;
    console.log(`Inserted test task log with ID: ${taskLogId}`);
    
    // Step 4: Retrieve the task log to verify
    console.log('Retrieving test task log...');
    const retrievedLog = await db.execute(sql`
      SELECT * FROM task_logs WHERE id = ${taskLogId}
    `);
    
    console.log('Retrieved task log:');
    console.log(retrievedLog[0]);
    
    console.log('\nDatabase logging test completed successfully!');
  } catch (error) {
    console.error('Error during database test:', error);
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Run the test
testDbLogging();