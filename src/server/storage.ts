
import { eq, and } from "drizzle-orm";
import * as CryptoJS from "crypto-js";
import { db } from '../shared/db.js';
import { 
  users, 
  credentials,
  taskLogs
} from '../shared/schema.js';

// Type definitions
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Credential = typeof credentials.$inferSelect;
export type UpsertCredential = Omit<typeof credentials.$inferInsert, 'encryptedData'> & { password: string };
export type TaskLog = typeof taskLogs.$inferSelect;

// Storage interface for database operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Credential operations
  getCredential(userId: string, platform: string): Promise<{ username: string, password: string } | null>;
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
  async getCredential(userId: string, platform: string): Promise<{ username: string, password: string } | null> {
    const [credential] = await db
      .select()
      .from(credentials)
      .where(and(
        eq(credentials.userId!, userId),
        eq(credentials.platform!, platform)
      ));
    
    if (!credential) {
      return null;
    }
    
    // Decrypt the password
    const decryptedPassword = this.decryptPassword(credential.encryptedData);
    
    return {
      username: credential.label || '',
      password: decryptedPassword
    };
  }
  
  async saveCredential(credentialData: UpsertCredential): Promise<Credential> {
    // Encrypt the password before storing
    const encryptedData = this.encryptPassword(credentialData.password);
    
    // Remove the plain text password and add the encrypted one
    const { password, ...rest } = credentialData;
    const dataToInsert = {
      ...rest,
      encryptedData
    };
    
    const [credential] = await db
      .insert(credentials)
      .values(dataToInsert)
      .onConflictDoUpdate({
        target: [credentials.userId!, credentials.platform!],
        set: {
          label: dataToInsert.label,
          encryptedData: dataToInsert.encryptedData,
        },
      })
      .returning();
    
    return credential;
  }
  
  async deleteCredential(credentialId: string, userId: string): Promise<boolean> {
    try {
      // Ensure the credential belongs to the user requesting deletion
      const result = await db
        .delete(credentials)
        .where(and(
          eq(credentials.id, credentialId),
          eq(credentials.userId!, userId)
        ))
        .returning({ id: credentials.id });
      
      // If a row was deleted (array has length), return success
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting credential:', error);
      return false;
    }
  }
  
  async listCredentials(userId: string): Promise<Credential[]> {
    return await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId!, userId));
  }
  
  // Task log operations
  async logTask(taskLogData: Omit<typeof taskLogs.$inferInsert, 'id' | 'createdAt'>): Promise<TaskLog> {
    const [taskLog] = await db
      .insert(taskLogs)
      .values(taskLogData)
      .returning();
    
    return taskLog;
  }
  
  async getTaskLog(id: string): Promise<TaskLog | undefined> {
    const [taskLog] = await db
      .select()
      .from(taskLogs)
      .where(eq(taskLogs.id, id));
    
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
    
    return await db
      .select()
      .from(taskLogs)
      .orderBy(taskLogs.createdAt);
  }
  
  // Helper methods for password encryption/decryption
  private encryptPassword(password: string): string {
    return CryptoJS.AES.encrypt(password, this.encryptionKey).toString();
  }
  
  private decryptPassword(encryptedPassword: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

// Create and export a singleton instance
export const storage = new DatabaseStorage();
