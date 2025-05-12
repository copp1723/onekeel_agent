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
//# sourceMappingURL=schema.js.map