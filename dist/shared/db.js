import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Define the database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}
// Create a postgres client with the connection string
const client = postgres(connectionString);
// Export the Drizzle DB instance
export const db = drizzle(client);
//# sourceMappingURL=db.js.map