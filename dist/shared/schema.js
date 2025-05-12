import { pgTable, text, varchar, timestamp, jsonb, index, uuid, boolean, } from "drizzle-orm/pg-core";
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
//# sourceMappingURL=schema.js.map