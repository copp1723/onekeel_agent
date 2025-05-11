import postgres from 'postgres';
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<Record<string, never>> & {
    $client: postgres.Sql<{}>;
};
export declare const pgClient: postgres.Sql<{}>;
export declare function testConnection(): Promise<boolean>;
