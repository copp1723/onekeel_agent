import { pgTable, text, varchar, timestamp, jsonb, index, uuid, boolean, serial, integer, } from "drizzle-orm/pg-core";
// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable("sessions", {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
}, (table) => [index("IDX_session_expire").on(table.expire)]);
// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
    id: varchar("id").primaryKey().notNull(),
    email: varchar("email").unique(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Credential storage with encryption
export const credentials = pgTable("credentials", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    userId: varchar("user_id").notNull().references(() => users.id),
    platform: varchar("platform", { length: 50 }).notNull(),
    label: varchar("label", { length: 100 }),
    encryptedData: text("encrypted_data").notNull(),
    iv: text("iv").notNull(), // Initialization vector for AES
    refreshToken: text("refresh_token"),
    refreshTokenExpiry: timestamp("refresh_token_expiry"),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
    index("idx_credentials_user_platform").on(table.userId, table.platform),
]);
// Execution plans for multi-step tasks
export const plans = pgTable("plans", {
    id: serial("id").primaryKey(),
    task: text("task").notNull(),
    status: varchar("status", { length: 20 }).default("pending"),
    result: jsonb("result"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
});
// Task logs for tracking tasks and their execution
export const taskLogs = pgTable("task_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id"),
    taskType: varchar("task_type", { length: 50 }).notNull(),
    taskText: text("task_text").notNull(),
    taskData: jsonb("task_data"),
    status: varchar("status", { length: 20 }).default("pending"),
    result: jsonb("result"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
});
// Job Queue for task retry and recovery
export const jobs = pgTable("jobs", {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id").references(() => taskLogs.id),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(2).notNull(),
    lastError: text("last_error"),
    nextRunAt: timestamp("next_run_at").defaultNow().notNull(),
    lastRunAt: timestamp("last_run_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_jobs_status").on(table.status),
    index("idx_jobs_next_run_at").on(table.nextRunAt),
]);
// Workflows for persistent multi-step task execution with memory
export const workflows = pgTable("workflows", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id").references(() => users.id),
    steps: jsonb("steps").notNull(), // JSON array of step definitions
    currentStep: integer("current_step").default(0).notNull(),
    context: jsonb("context").default({}).notNull(), // Accumulated context/memory
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    lastError: text("last_error"),
    lastUpdated: timestamp("last_updated"),
    locked: boolean("locked").default(false), // Concurrency guard
    lockedAt: timestamp("locked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_workflows_status").on(table.status),
    index("idx_workflows_user").on(table.userId),
]);
// Scheduler for automated workflow execution
export const schedules = pgTable("schedules", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: 'cascade' }),
    cron: text("cron").notNull(), // Cron expression for schedule
    lastRunAt: timestamp("last_run_at"),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_schedules_workflow_id").on(table.workflowId),
    index("idx_schedules_enabled").on(table.enabled),
]);
// Email logs for tracking email sending
export const emailLogs = pgTable("email_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: 'set null' }),
    recipientEmail: text("recipient_email").notNull(),
    subject: text("subject").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, sent, failed
    attempts: integer("attempts").default(1).notNull(),
    sentAt: timestamp("sent_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_email_logs_workflow_id").on(table.workflowId),
    index("idx_email_logs_status").on(table.status),
]);
// Email notification configuration for workflows
export const emailNotifications = pgTable("email_notifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: 'cascade' }).unique(),
    recipientEmail: text("recipient_email").notNull(),
    sendOnCompletion: boolean("send_on_completion").default(true).notNull(),
    sendOnFailure: boolean("send_on_failure").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_email_notifications_workflow_id").on(table.workflowId),
]);
// Health check tables for API and service monitoring
export const healthChecks = pgTable("health_checks", {
    id: varchar("id", { length: 50 }).primaryKey(), // Use a stable identifier like 'database', 'email', etc.
    name: varchar("name", { length: 100 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(), // 'ok', 'warning', 'error'
    responseTime: integer("response_time").notNull(), // in milliseconds
    lastChecked: timestamp("last_checked").notNull(),
    message: text("message"),
    details: text("details"), // JSON stringified details
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_health_checks_status").on(table.status),
    index("idx_health_checks_last_checked").on(table.lastChecked),
]);
// Health check logs for historical tracking
export const healthLogs = pgTable("health_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    checkId: varchar("check_id", { length: 50 }).notNull().references(() => healthChecks.id),
    timestamp: timestamp("timestamp").notNull(),
    status: varchar("status", { length: 20 }).notNull(), // 'ok', 'warning', 'error'
    responseTime: integer("response_time").notNull(), // in milliseconds
    message: text("message"),
    details: text("details"), // JSON stringified details
}, (table) => [
    index("idx_health_logs_check_id").on(table.checkId),
    index("idx_health_logs_timestamp").on(table.timestamp),
]);
//# sourceMappingURL=schema.js.map