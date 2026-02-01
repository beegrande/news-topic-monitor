import type { Webhook, Topic, Article } from "~/db/schema";
import {
  findWebhooksForTopic,
  updateWebhookLastTriggered,
  updateWebhookError,
} from "~/data-access/webhooks";

export interface WebhookPayload {
  event: "new_article" | "test";
  timestamp: string;
  topic: {
    id: string;
    name: string;
    keywords: string;
  } | null;
  article: {
    id: string;
    title: string;
    summary: string | null;
    url: string;
    source: string;
    publishedAt: string | null;
    sentiment?: string | null;
    relevanceScore?: number | null;
  };
}

/**
 * Generate HMAC signature for webhook payload
 */
async function generateSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Send a webhook payload to a single webhook endpoint
 */
export async function triggerWebhook(
  webhook: Webhook,
  payload: WebhookPayload
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "NewsTopicMonitor-Webhook/1.0",
    "X-Webhook-Event": payload.event,
    "X-Webhook-Timestamp": payload.timestamp,
  };

  // Add HMAC signature if secret is configured
  if (webhook.secret) {
    const signature = await generateSignature(body, webhook.secret);
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  const response = await fetch(webhook.url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Webhook request failed with status ${response.status}: ${response.statusText}`
    );
  }
}

/**
 * Trigger all webhooks for a new article matching a topic
 */
export async function triggerWebhooksForArticle(
  topic: Topic,
  article: Article,
  relevanceScore?: number
): Promise<{
  triggered: number;
  failed: number;
  errors: string[];
}> {
  const result = {
    triggered: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Find all enabled webhooks for this topic
  const webhooks = await findWebhooksForTopic(topic.id, topic.userId);

  if (webhooks.length === 0) {
    return result;
  }

  const payload: WebhookPayload = {
    event: "new_article",
    timestamp: new Date().toISOString(),
    topic: {
      id: topic.id,
      name: topic.name,
      keywords: topic.keywords,
    },
    article: {
      id: article.id,
      title: article.title,
      summary: article.summary,
      url: article.url,
      source: article.source,
      publishedAt: article.publishedAt?.toISOString() ?? null,
      sentiment: article.sentiment,
      relevanceScore: relevanceScore ?? null,
    },
  };

  // Trigger each webhook
  for (const webhook of webhooks) {
    try {
      await triggerWebhook(webhook, payload);
      await updateWebhookLastTriggered(webhook.id);
      result.triggered++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await updateWebhookError(webhook.id, errorMessage);
      result.failed++;
      result.errors.push(`Webhook ${webhook.id}: ${errorMessage}`);
    }
  }

  return result;
}

/**
 * Trigger webhooks for multiple articles matching a topic (batch processing)
 */
export async function triggerWebhooksForArticles(
  topic: Topic,
  articles: Array<{ article: Article; relevanceScore?: number }>
): Promise<{
  triggered: number;
  failed: number;
  errors: string[];
}> {
  const result = {
    triggered: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const { article, relevanceScore } of articles) {
    const articleResult = await triggerWebhooksForArticle(
      topic,
      article,
      relevanceScore
    );
    result.triggered += articleResult.triggered;
    result.failed += articleResult.failed;
    result.errors.push(...articleResult.errors);
  }

  return result;
}
