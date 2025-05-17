import { db } from '../shared/db.js';
import { getErrorMessage } from '....js';
import { getErrorMessage } from '....js';
import { isError } from '../utils/errorUtils.js';
import { apiKeys, dealerCredentials } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Define interface for dealer credentials
interface DealerCredential {
  id: string;
  dealerId: string;
  platform: string;
  username: string;
  encryptedPassword: string;
  iv: string;
  apiEndpoint?: string;
  active: boolean;
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export async function getApiKey(keyName: string): Promise<string | null> {
  try {
    const [result] = await db.select().from(apiKeys).where(eq(apiKeys.keyName, keyName));
    return result?.keyValue || null;
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'supabase_api_key_retrieval_error',
        keyName,
        errorMessage: isError(error) ? getErrorMessage(error) : String(error),
        stack:
          error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined) : undefined) : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error retrieving API key from Supabase'
    );
    return null;
  }
}
export async function updateLastUsed(id: string): Promise<void> {
  await db
    .update(dealerCredentials)
    .set({ lastUsed: new Date() })
    .where(eq(dealerCredentials.id, id.toString()));
}
export async function getDealerCredentials(dealerId: string): Promise<DealerCredential | null> {
  try {
    const [result] = await db
      .select()
      .from(dealerCredentials)
      .where(eq(dealerCredentials.dealerId!, dealerId));
    return result || null;
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'supabase_dealer_credentials_retrieval_error',
        dealerId,
        errorMessage: isError(error) ? getErrorMessage(error) : String(error),
        stack:
          error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined) : undefined) : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error retrieving dealer credentials from Supabase'
    );
    return null;
  }
}
export async function saveDealerCredentials(
  credentials: Omit<DealerCredential, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DealerCredential | null> {
  try {
    const [result] = await db
      .insert(dealerCredentials)
      .values({
        dealerId: credentials.dealerId!,
        platform: credentials.platform!,
        username: credentials.username,
        encryptedPassword: credentials.encryptedPassword,
        iv: credentials.iv,
        active: true,
        apiEndpoint: credentials.apiEndpoint,
      })
      .returning();
    return result;
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'supabase_dealer_credentials_save_error',
        dealerId: credentials.dealerId!,
        errorMessage: isError(error) ? getErrorMessage(error) : String(error),
        stack:
          error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined) : undefined) : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error saving dealer credentials to Supabase'
    );
    return null;
  }
}
