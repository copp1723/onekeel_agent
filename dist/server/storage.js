import { eq, and } from "drizzle-orm";
import * as CryptoJS from "crypto-js";
import { db } from '../shared/db.js';
import { users, credentials, taskLogs } from '../shared/schema.js';
// Database implementation of storage operations
export class DatabaseStorage {
    encryptionKey;
    constructor() {
        // In production, this should come from environment variables
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'temporary-encryption-key';
    }
    // User operations
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async upsertUser(userData) {
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
    async getCredential(userId, platform) {
        const [credential] = await db
            .select()
            .from(credentials)
            .where(and(eq(credentials.userId, userId), eq(credentials.platform, platform)));
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
    async saveCredential(credentialData) {
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
            target: [credentials.userId, credentials.platform],
            set: {
                label: dataToInsert.label,
                encryptedData: dataToInsert.encryptedData,
            },
        })
            .returning();
        return credential;
    }
    async deleteCredential(credentialId, userId) {
        try {
            // Ensure the credential belongs to the user requesting deletion
            const result = await db
                .delete(credentials)
                .where(and(eq(credentials.id, credentialId), eq(credentials.userId, userId)))
                .returning({ id: credentials.id });
            // If a row was deleted (array has length), return success
            return result.length > 0;
        }
        catch (error) {
            console.error('Error deleting credential:', error);
            return false;
        }
    }
    async listCredentials(userId) {
        return await db
            .select()
            .from(credentials)
            .where(eq(credentials.userId, userId));
    }
    // Task log operations
    async logTask(taskLogData) {
        const [taskLog] = await db
            .insert(taskLogs)
            .values(taskLogData)
            .returning();
        return taskLog;
    }
    async getTaskLog(id) {
        const [taskLog] = await db
            .select()
            .from(taskLogs)
            .where(eq(taskLogs.id, id));
        return taskLog;
    }
    async getTaskLogs(userId) {
        if (userId) {
            return await db
                .select()
                .from(taskLogs)
                .where(eq(taskLogs.userId, userId))
                .orderBy(taskLogs.createdAt);
        }
        return await db
            .select()
            .from(taskLogs)
            .orderBy(taskLogs.createdAt);
    }
    // Helper methods for password encryption/decryption
    encryptPassword(password) {
        return CryptoJS.AES.encrypt(password, this.encryptionKey).toString();
    }
    decryptPassword(encryptedPassword) {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, this.encryptionKey);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}
// Create and export a singleton instance
export const storage = new DatabaseStorage();
//# sourceMappingURL=storage.js.map