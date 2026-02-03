import { eq } from "drizzle-orm";
import { database } from "~/db";
import { user, type NewsProvider } from "~/db/schema";
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

// ============================================================================
// Anthropic API Key Functions
// ============================================================================

/**
 * Get the encrypted Anthropic API key for a user
 */
export async function getEncryptedAnthropicApiKey(
  userId: string
): Promise<string | null> {
  const [result] = await database
    .select({ anthropicApiKey: user.anthropicApiKey })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result?.anthropicApiKey || null;
}

/**
 * Get the decrypted Anthropic API key for a user
 */
export async function getAnthropicApiKey(userId: string): Promise<string | null> {
  const encryptedKey = await getEncryptedAnthropicApiKey(userId);

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
 * Check if a user has configured their Anthropic API key
 */
export async function hasAnthropicApiKey(userId: string): Promise<boolean> {
  const [result] = await database
    .select({ anthropicApiKey: user.anthropicApiKey })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return !!result?.anthropicApiKey;
}

/**
 * Get the timestamp when the Anthropic API key was last updated
 */
export async function getAnthropicApiKeyUpdatedAt(
  userId: string
): Promise<Date | null> {
  const [result] = await database
    .select({ anthropicApiKeyUpdatedAt: user.anthropicApiKeyUpdatedAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result?.anthropicApiKeyUpdatedAt || null;
}

/**
 * Save (encrypt and store) an Anthropic API key for a user
 */
export async function saveAnthropicApiKey(
  userId: string,
  apiKey: string
): Promise<void> {
  const encryptedKey = encrypt(apiKey, privateEnv.BETTER_AUTH_SECRET);

  await database
    .update(user)
    .set({
      anthropicApiKey: encryptedKey,
      anthropicApiKeyUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

/**
 * Delete the Anthropic API key for a user
 */
export async function deleteAnthropicApiKey(userId: string): Promise<void> {
  await database
    .update(user)
    .set({
      anthropicApiKey: null,
      anthropicApiKeyUpdatedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

// ============================================================================
// News Provider Selection Functions
// ============================================================================

/**
 * Get the user's selected news provider
 */
export async function getNewsProvider(userId: string): Promise<NewsProvider> {
  const [result] = await database
    .select({ newsProvider: user.newsProvider })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return (result?.newsProvider as NewsProvider) || "openai";
}

/**
 * Set the user's preferred news provider
 */
export async function setNewsProvider(
  userId: string,
  provider: NewsProvider
): Promise<void> {
  await database
    .update(user)
    .set({
      newsProvider: provider,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}
