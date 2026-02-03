import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  hasOpenAIApiKey,
  getOpenAIApiKeyUpdatedAt,
  saveOpenAIApiKey,
  deleteOpenAIApiKey,
  getOpenAIApiKey,
} from "~/data-access/api-keys";
import { testOpenAIApiKey } from "~/services/openai-news";

export interface ApiKeyStatus {
  hasOpenAIKey: boolean;
  openAIKeyUpdatedAt: Date | null;
}

export const getApiKeyStatusFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<ApiKeyStatus> => {
    const [hasKey, updatedAt] = await Promise.all([
      hasOpenAIApiKey(context.userId),
      getOpenAIApiKeyUpdatedAt(context.userId),
    ]);

    return {
      hasOpenAIKey: hasKey,
      openAIKeyUpdatedAt: updatedAt,
    };
  });

export const saveApiKeyFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      apiKey: z.string().min(1, "API key is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Validate the API key format (OpenAI keys start with "sk-")
    if (!data.apiKey.startsWith("sk-")) {
      throw new Error("Invalid OpenAI API key format");
    }

    await saveOpenAIApiKey(context.userId, data.apiKey);

    return { success: true };
  });

export const deleteApiKeyFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    await deleteOpenAIApiKey(context.userId);

    return { success: true };
  });

export const testApiKeyFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const apiKey = await getOpenAIApiKey(context.userId);

    if (!apiKey) {
      throw new Error("No API key configured");
    }

    const isValid = await testOpenAIApiKey(apiKey);

    if (!isValid) {
      throw new Error("API key is invalid or expired");
    }

    return { success: true, message: "API key is valid" };
  });
