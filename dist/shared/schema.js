import { pgTable, text, varchar, uuid, timestamp, jsonb, json, integer, index } from "drizzle-orm/pg-core";
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
// Define the plans table for multi-step execution plans
export const plans = pgTable('plans', {
    id: uuid('id').primaryKey().defaultRandom(),
    task: text('task').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
// Define the steps table for individual execution steps within a plan
export const steps = pgTable('steps', {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id').references(() => plans.id).notNull(),
    stepIndex: integer('step_index').notNull(),
    tool: text('tool').notNull(),
    input: json('input').notNull(),
    output: json('output'),
    status: text('status').default('pending'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow(),
});
// Define the users table for Replit auth
export const users = pgTable('users', {
    id: varchar('id').primaryKey().notNull(), // Replit user ID
    email: varchar('email').unique(),
    firstName: varchar('first_name'),
    lastName: varchar('last_name'),
    profileImageUrl: varchar('profile_image_url'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
// Define the sessions table for Replit auth
export const sessions = pgTable('sessions', {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
}, (table) => [index('IDX_session_expire').on(table.expire)]);
// Define the credentials table for storing user credentials
export const credentials = pgTable('credentials', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id').notNull().references(() => users.id),
    site: varchar('site', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }).notNull(),
    passwordEncrypted: text('password_encrypted').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    // Create an index on userId and site for faster lookups
    userSiteIdx: index('credential_user_site_idx').on(table.userId, table.site),
}));
// Update task logs to include user ID
export const updatedTaskLogs = pgTable('task_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id').references(() => users.id), // Add reference to user
    userInput: text('user_input').notNull(),
    tool: text('tool').notNull(),
    status: text('status').notNull(), // 'success' or 'error'
    output: jsonb('output'),
    createdAt: timestamp('created_at').defaultNow(),
});
//# sourceMappingURL=schema.js.map