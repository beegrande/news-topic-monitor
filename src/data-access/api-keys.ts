import { eq } from "drizzle-orm";
import { database } from "~/db";
import { user } from "~/db/schema";
import { encrypt, decrypt } from "~/utils/encryption";
import { privateEnv } from "~/config/privateEnv";

/**
 * Get the encrypted OpenAI API key for a user
 */
export async function getEncryptedOpenAIApiKey(
  userId: string
): Promise<string | null> {
  const [result] = await database
    .select({ openaiApiKey: user.openaiApiKey })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result?.openaiApiKey || null;
}

/**
 * Get the decrypted OpenAI API key for a user
 */
export async function getOpenAIApiKey(userId: string): Promise<string | null> {
  const encryptedKey = await getEncryptedOpenAIApiKey(userId);

  if (!encryptedKey) {
    return null;
  }

  try {
    return decrypt(encryptedKey, privateEnv.BETTER_AUTH_SECRET);
  } catch {
    // If decryption fails, the key is corrupted
    return null;
  }
}

/**
 * Check if a user has configured their OpenAI API key
 */
export async function hasOpenAIApiKey(userId: string): Promise<boolean> {
  const [result] = await database
    .select({ openaiApiKey: user.openaiApiKey })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return !!result?.openaiApiKey;
}

/**
 * Get the timestamp when the API key was last updated
 */
export async function getOpenAIApiKeyUpdatedAt(
  userId: string
): Promise<Date | null> {
  const [result] = await database
    .select({ openaiApiKeyUpdatedAt: user.openaiApiKeyUpdatedAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result?.openaiApiKeyUpdatedAt || null;
}

/**
 * Save (encrypt and store) an OpenAI API key for a user
 */
export async function saveOpenAIApiKey(
  userId: string,
  apiKey: string
): Promise<void> {
  const encryptedKey = encrypt(apiKey, privateEnv.BETTER_AUTH_SECRET);

  await database
    .update(user)
    .set({
      openaiApiKey: encryptedKey,
      openaiApiKeyUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

/**
 * Delete the OpenAI API key for a user
 */
export async function deleteOpenAIApiKey(userId: string): Promise<void> {
  await database
    .update(user)
    .set({
      openaiApiKey: null,
      openaiApiKeyUpdatedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}
