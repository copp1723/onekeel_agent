import { pgTable, text, varchar, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";

// Define the API keys table structure
export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey().notNull(),
  keyName: varchar('key_name', { length: 255 }).notNull().unique(),
  keyValue: text('key_value').notNull(),
});

// Define the dealer credentials table structure
export const dealerCredentials = pgTable('dealer_credentials', {
  dealerId: text('dealer_id').primaryKey().notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  apiEndpoint: text('api_endpoint'),
  lastUsed: text('last_used'),
});

// Define the task logs table for execution tracking
export const taskLogs = pgTable('task_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userInput: text('user_input').notNull(),
  tool: text('tool').notNull(),
  status: text('status').notNull(), // 'success' or 'error'
  output: jsonb('output'),
  createdAt: timestamp('created_at').defaultNow(),
});