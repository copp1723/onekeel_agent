import { eq, and, sql } from 'drizzle-orm';
import * as CryptoJS from 'crypto-js';
import { db } from '../../../shared/db.js';
import { users, credentials, taskLogs } from '../../../shared/schema.js';
// Type definitions
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Credential = {
  id: string;
  userId: string;
  platform: string;
  label: string | null;
  encryptedData: string;
  iv: string;
  refreshToken?: string | null;
  refreshTokenExpiry?: Date | null;
  active?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};
export type UpsertCredential = Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>;
export type TaskLog = typeof taskLogs.$inferSelect;
// Storage interface for database operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Credential operations
  getCredential(
    userId: string,
    platform: string
  ): Promise<{ username: string; password: string } | null>;
  saveCredential(credential: UpsertCredential): Promise<Credential>;
  deleteCredential(credentialId: string, userId: string): Promise<boolean>;
  listCredentials(userId: string): Promise<Credential[]>;
  // Task log operations
  logTask(taskLog: Omit<typeof taskLogs.$inferInsert, 'id' | 'createdAt'>): Promise<TaskLog>;
  getTaskLog(id: string): Promise<TaskLog | undefined>;
  getTaskLogs(userId?: string): Promise<TaskLog[]>;
}
// Database implementation of storage operations
export class DatabaseStorage implements IStorage {
  private readonly encryptionKey: string;
  constructor() {
    // In production, this should come from environment variables
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'temporary-encryption-key';
  }
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id.toString()));
    return user;
  }
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  // Credential operations
  async getCredential(
    userId: string,
    platform: string
  ): Promise<{ username: string; password: string } | null> {
    const [credential] = await db
      .select()
      .from(credentials)
      .where(and(eq(credentials.userId!, userId), eq(credentials.platform!, platform)));
    if (!credential) {
      return null;
    }
    // Decrypt the password
    const decryptedPassword = this.decryptPassword(credential.encryptedData, credential.iv);
    return {
      username: credential.label || '',
      password: decryptedPassword,
    };
  }
  async saveCredential(credentialData: UpsertCredential): Promise<Credential> {
    // Encrypt the password before storing
    const encrypted = this.encryptPassword(credentialData.password);
    // Remove the plain text password and add the encrypted one
    const { password, ...rest } = credentialData;
    const dataToInsert = {
      ...rest,
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      active: true
    };
    const credential = await db.insert(credentials).values({
      userId: credentialData.userId,
      platform: credentialData.platform,
      label: credentialData.label,
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      active: true
    }).returning();
    return credential;
  }
  async deleteCredential(credentialId: string, userId: string): Promise<boolean> {
    try {
      // Ensure the credential belongs to the user requesting deletion
      const result = await db
        .delete(credentials)
        .where(and(eq(credentials.id, credentialId.toString()), eq(credentials.userId!, userId)))
        .returning({ id: sql`${credentials.id}` });
      // If a row was deleted (array has length), return success
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting credential:', error);
      return false;
    }
  }
  async listCredentials(userId: string): Promise<Credential[]> {
    return await db.select().from(credentials).where(eq(credentials.userId!, userId));
  }
  // Task log operations
  async logTask(
    taskLogData: Omit<typeof taskLogs.$inferInsert, 'id' | 'createdAt'>
  ): Promise<TaskLog> {
    const [taskLog] = await db.insert(taskLogs).values(taskLogData).returning();
    return taskLog;
  }
  async getTaskLog(id: string): Promise<TaskLog | undefined> {
    const [taskLog] = await db.select().from(taskLogs).where(eq(taskLogs.id, id.toString()));
    return taskLog;
  }
  async getTaskLogs(userId?: string): Promise<TaskLog[]> {
    if (userId) {
      return await db
        .select()
        .from(taskLogs)
        .where(eq(taskLogs.userId!, userId))
        .orderBy(taskLogs.createdAt);
    }
    return await db.select().from(taskLogs).orderBy(taskLogs.createdAt);
  }
  // Helper methods for password encryption/decryption
  private encryptPassword(password: string): { encryptedData: string; iv: string } {
    const encrypted = CryptoJS.AES.encrypt(password, this.encryptionKey);
    return {
      encryptedData: encrypted.toString(),
      iv: encrypted.iv.toString(),
    };
  }
  private decryptPassword(encryptedPassword: string, iv: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, this.encryptionKey, { iv: CryptoJS.enc.Hex.parse(iv) });
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
// Create and export a singleton instance
export const storage = new DatabaseStorage();
