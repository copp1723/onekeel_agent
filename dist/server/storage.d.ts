import { users, credentials, updatedTaskLogs as taskLogs } from "../shared/schema";
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Credential = typeof credentials.$inferSelect;
export type UpsertCredential = Omit<typeof credentials.$inferInsert, 'passwordEncrypted'> & {
    password: string;
};
export type TaskLog = typeof taskLogs.$inferSelect;
export interface IStorage {
    getUser(id: string): Promise<User | undefined>;
    upsertUser(user: UpsertUser): Promise<User>;
    getCredential(userId: string, site: string): Promise<{
        username: string;
        password: string;
    } | null>;
    saveCredential(credential: UpsertCredential): Promise<Credential>;
    deleteCredential(credentialId: string, userId: string): Promise<boolean>;
    listCredentials(userId: string): Promise<Credential[]>;
    logTask(taskLog: Omit<typeof taskLogs.$inferInsert, 'id' | 'createdAt'>): Promise<TaskLog>;
    getTaskLog(id: string): Promise<TaskLog | undefined>;
    getTaskLogs(userId?: string): Promise<TaskLog[]>;
}
export declare class DatabaseStorage implements IStorage {
    private readonly encryptionKey;
    constructor();
    getUser(id: string): Promise<User | undefined>;
    upsertUser(userData: UpsertUser): Promise<User>;
    getCredential(userId: string, site: string): Promise<{
        username: string;
        password: string;
    } | null>;
    saveCredential(credentialData: UpsertCredential): Promise<Credential>;
    deleteCredential(credentialId: string, userId: string): Promise<boolean>;
    listCredentials(userId: string): Promise<Credential[]>;
    logTask(taskLogData: Omit<typeof taskLogs.$inferInsert, 'id' | 'createdAt'>): Promise<TaskLog>;
    getTaskLog(id: string): Promise<TaskLog | undefined>;
    getTaskLogs(userId?: string): Promise<TaskLog[]>;
    private encryptPassword;
    private decryptPassword;
}
export declare const storage: DatabaseStorage;
