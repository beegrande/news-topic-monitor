import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiKeyStatusQuery } from "~/queries/api-keys";
import {
  saveApiKeyFn,
  deleteApiKeyFn,
  testApiKeyFn,
  setNewsProviderFn,
} from "~/fn/api-keys";
import { toast } from "sonner";
import type { NewsProvider } from "~/db/schema";

export function useApiKeyStatus() {
  return useQuery(getApiKeyStatusQuery());
}

export function useSaveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      provider,
      apiKey,
    }: {
      provider: NewsProvider;
      apiKey: string;
    }) => saveApiKeyFn({ data: { provider, apiKey } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      const providerName = variables.provider === "openai" ? "OpenAI" : "Anthropic";
      toast.success(`${providerName} API key saved successfully`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save API key"
      );
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: NewsProvider) =>
      deleteApiKeyFn({ data: { provider } }),
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      const providerName = provider === "openai" ? "OpenAI" : "Anthropic";
      toast.success(`${providerName} API key deleted successfully`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete API key"
      );
    },
  });
}

export function useTestApiKey() {
  return useMutation({
    mutationFn: (provider: NewsProvider) => testApiKeyFn({ data: { provider } }),
    onSuccess: (_, provider) => {
      const providerName = provider === "openai" ? "OpenAI" : "Anthropic";
      toast.success(`${providerName} API key is valid and working`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "API key test failed"
      );
    },
  });
}

export function useSetNewsProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: NewsProvider) =>
      setNewsProviderFn({ data: { provider } }),
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      const providerName = provider === "openai" ? "OpenAI" : "Anthropic";
      toast.success(`News provider set to ${providerName}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update provider"
      );
    },
  });
}
