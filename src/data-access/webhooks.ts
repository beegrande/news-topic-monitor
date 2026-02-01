import { eq, and, or, isNull, desc } from "drizzle-orm";
import { database } from "~/db";
import {
  webhook,
  topic,
  type Webhook,
  type CreateWebhookData,
  type UpdateWebhookData,
  type Topic,
} from "~/db/schema";

export interface WebhookWithTopic extends Webhook {
  topic?: Topic | null;
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  data: CreateWebhookData
): Promise<Webhook> {
  const [newWebhook] = await database
    .insert(webhook)
    .values(data)
    .returning();

  return newWebhook;
}

/**
 * Find a webhook by ID
 */
export async function findWebhookById(id: string): Promise<Webhook | null> {
  const [result] = await database
    .select()
    .from(webhook)
    .where(eq(webhook.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a webhook by ID with topic details
 */
export async function findWebhookByIdWithTopic(
  id: string
): Promise<WebhookWithTopic | null> {
  const [result] = await database
    .select({
      webhook: webhook,
      topic: topic,
    })
    .from(webhook)
    .leftJoin(topic, eq(webhook.topicId, topic.id))
    .where(eq(webhook.id, id))
    .limit(1);

  if (!result) return null;

  return {
    ...result.webhook,
    topic: result.topic,
  };
}

/**
 * Find all webhooks for a user
 */
export async function findWebhooksByUserId(
  userId: string
): Promise<WebhookWithTopic[]> {
  const results = await database
    .select({
      webhook: webhook,
      topic: topic,
    })
    .from(webhook)
    .leftJoin(topic, eq(webhook.topicId, topic.id))
    .where(eq(webhook.userId, userId))
    .orderBy(desc(webhook.createdAt));

  return results.map((r) => ({
    ...r.webhook,
    topic: r.topic,
  }));
}

/**
 * Find enabled webhooks that should be triggered for a specific topic.
 * Returns webhooks that either:
 * - Are configured for the specific topic, OR
 * - Are configured for all topics (topicId is null) and belong to the topic's owner
 */
export async function findWebhooksForTopic(
  topicId: string,
  topicOwnerId: string
): Promise<Webhook[]> {
  const results = await database
    .select()
    .from(webhook)
    .where(
      and(
        eq(webhook.isEnabled, true),
        eq(webhook.userId, topicOwnerId),
        or(eq(webhook.topicId, topicId), isNull(webhook.topicId))
      )
    );

  return results;
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  id: string,
  userId: string,
  data: UpdateWebhookData
): Promise<Webhook | null> {
  const [updated] = await database
    .update(webhook)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(webhook.id, id), eq(webhook.userId, userId)))
    .returning();

  return updated || null;
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await database
    .delete(webhook)
    .where(and(eq(webhook.id, id), eq(webhook.userId, userId)));

  return (result.rowCount ?? 0) > 0;
}

/**
 * Update webhook last triggered timestamp
 */
export async function updateWebhookLastTriggered(id: string): Promise<void> {
  await database
    .update(webhook)
    .set({
      lastTriggeredAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(webhook.id, id));
}

/**
 * Update webhook with error
 */
export async function updateWebhookError(
  id: string,
  error: string
): Promise<void> {
  await database
    .update(webhook)
    .set({
      lastError: error,
      updatedAt: new Date(),
    })
    .where(eq(webhook.id, id));
}

/**
 * Check if a webhook belongs to a user
 */
export async function checkWebhookOwnership(
  webhookId: string,
  userId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: webhook.id })
    .from(webhook)
    .where(and(eq(webhook.id, webhookId), eq(webhook.userId, userId)))
    .limit(1);

  return !!result;
}

/**
 * Count webhooks for a user
 */
export async function countWebhooksByUserId(userId: string): Promise<number> {
  const results = await database
    .select({ id: webhook.id })
    .from(webhook)
    .where(eq(webhook.userId, userId));

  return results.length;
}
