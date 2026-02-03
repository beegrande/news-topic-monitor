import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  hasOpenAIApiKey,
  getOpenAIApiKeyUpdatedAt,
  saveOpenAIApiKey,
  deleteOpenAIApiKey,
  getOpenAIApiKey,
  hasAnthropicApiKey,
  getAnthropicApiKeyUpdatedAt,
  saveAnthropicApiKey,
  deleteAnthropicApiKey,
  getAnthropicApiKey,
  getNewsProvider,
  setNewsProvider,
} from "~/data-access/api-keys";
import { testOpenAIApiKey } from "~/services/openai-news";
import { testAnthropicApiKey } from "~/services/anthropic-news";
import type { NewsProvider } from "~/db/schema";

export interface ApiKeyStatus {
  hasOpenAIKey: boolean;
  openAIKeyUpdatedAt: Date | null;
  hasAnthropicKey: boolean;
  anthropicKeyUpdatedAt: Date | null;
  newsProvider: NewsProvider;
}

export const getApiKeyStatusFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<ApiKeyStatus> => {
    const [
      hasOpenAI,
      openAIUpdatedAt,
      hasAnthropic,
      anthropicUpdatedAt,
      provider,
    ] = await Promise.all([
      hasOpenAIApiKey(context.userId),
      getOpenAIApiKeyUpdatedAt(context.userId),
      hasAnthropicApiKey(context.userId),
      getAnthropicApiKeyUpdatedAt(context.userId),
      getNewsProvider(context.userId),
    ]);

    return {
      hasOpenAIKey: hasOpenAI,
      openAIKeyUpdatedAt: openAIUpdatedAt,
      hasAnthropicKey: hasAnthropic,
      anthropicKeyUpdatedAt: anthropicUpdatedAt,
      newsProvider: provider,
    };
  });

const providerSchema = z.enum(["openai", "anthropic"]);

export const saveApiKeyFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      provider: providerSchema,
      apiKey: z.string().min(1, "API key is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    if (data.provider === "openai") {
      // Validate the API key format (OpenAI keys start with "sk-")
      if (!data.apiKey.startsWith("sk-")) {
        throw new Error("Invalid OpenAI API key format");
      }
      await saveOpenAIApiKey(context.userId, data.apiKey);
    } else {
      // Validate the API key format (Anthropic keys start with "sk-ant-")
      if (!data.apiKey.startsWith("sk-ant-")) {
        throw new Error("Invalid Anthropic API key format");
      }
      await saveAnthropicApiKey(context.userId, data.apiKey);
    }

    return { success: true };
  });

export const deleteApiKeyFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      provider: providerSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    if (data.provider === "openai") {
      await deleteOpenAIApiKey(context.userId);
    } else {
      await deleteAnthropicApiKey(context.userId);
    }

    return { success: true };
  });

export const testApiKeyFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      provider: providerSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    if (data.provider === "openai") {
      const apiKey = await getOpenAIApiKey(context.userId);
      if (!apiKey) {
        throw new Error("No OpenAI API key configured");
      }
      const isValid = await testOpenAIApiKey(apiKey);
      if (!isValid) {
        throw new Error("OpenAI API key is invalid or expired");
      }
    } else {
      const apiKey = await getAnthropicApiKey(context.userId);
      if (!apiKey) {
        throw new Error("No Anthropic API key configured");
      }
      const isValid = await testAnthropicApiKey(apiKey);
      if (!isValid) {
        throw new Error("Anthropic API key is invalid or expired");
      }
    }

    return { success: true, message: "API key is valid" };
  });

export const setNewsProviderFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      provider: providerSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await setNewsProvider(context.userId, data.provider);
    return { success: true };
  });
