import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createWebhook,
  findWebhooksByUserId,
  findWebhookByIdWithTopic,
  updateWebhook,
  deleteWebhook,
  checkWebhookOwnership,
  updateWebhookLastTriggered,
} from "~/data-access/webhooks";
import { checkTopicOwnership } from "~/data-access/topics";
import { triggerWebhook } from "~/services/webhook-trigger";

export const getWebhooksFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await findWebhooksByUserId(context.userId);
  });

export const getWebhookByIdFn = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const webhook = await findWebhookByIdWithTopic(data.id);

    if (!webhook) {
      throw new Error("Webhook not found");
    }

    if (webhook.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    return webhook;
  });

export const createWebhookFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      name: z.string().min(1, "Name is required").max(100),
      url: z.string().url("Must be a valid URL"),
      topicId: z.string().nullable().optional(),
      secret: z.string().max(256).nullable().optional(),
      isEnabled: z.boolean().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // If topicId is provided, verify ownership
    if (data.topicId) {
      const ownsTopicResult = await checkTopicOwnership(
        data.topicId,
        context.userId
      );
      if (!ownsTopicResult) {
        throw new Error("Topic not found or unauthorized");
      }
    }

    const newWebhook = await createWebhook({
      id: crypto.randomUUID(),
      userId: context.userId,
      name: data.name,
      url: data.url,
      topicId: data.topicId ?? null,
      secret: data.secret ?? null,
      isEnabled: data.isEnabled ?? true,
    });

    return newWebhook;
  });

export const updateWebhookFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      url: z.string().url().optional(),
      topicId: z.string().nullable().optional(),
      secret: z.string().max(256).nullable().optional(),
      isEnabled: z.boolean().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // If changing topicId, verify ownership of new topic
    if (data.topicId) {
      const ownsTopicResult = await checkTopicOwnership(
        data.topicId,
        context.userId
      );
      if (!ownsTopicResult) {
        throw new Error("Topic not found or unauthorized");
      }
    }

    const { id, ...updateData } = data;
    const updated = await updateWebhook(id, context.userId, updateData);

    if (!updated) {
      throw new Error("Webhook not found or unauthorized");
    }

    return updated;
  });

export const deleteWebhookFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const deleted = await deleteWebhook(data.id, context.userId);

    if (!deleted) {
      throw new Error("Webhook not found or unauthorized");
    }

    return { success: true };
  });

export const testWebhookFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const ownsWebhook = await checkWebhookOwnership(data.id, context.userId);

    if (!ownsWebhook) {
      throw new Error("Webhook not found or unauthorized");
    }

    const webhook = await findWebhookByIdWithTopic(data.id);
    if (!webhook) {
      throw new Error("Webhook not found");
    }

    // Send a test payload
    const testPayload = {
      event: "test" as const,
      timestamp: new Date().toISOString(),
      topic: webhook.topic
        ? {
            id: webhook.topic.id,
            name: webhook.topic.name,
            keywords: webhook.topic.keywords,
          }
        : null,
      article: {
        id: "test-article-id",
        title: "Test Article Title",
        summary: "This is a test webhook payload to verify your integration.",
        url: "https://example.com/test-article",
        source: "Test Source",
        publishedAt: new Date().toISOString(),
      },
    };

    try {
      await triggerWebhook(webhook, testPayload);
      await updateWebhookLastTriggered(data.id);
      return { success: true, message: "Test webhook sent successfully" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to send test webhook: ${errorMessage}`);
    }
  });
