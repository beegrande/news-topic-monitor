import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiKeyStatusQuery } from "~/queries/api-keys";
import {
  saveApiKeyFn,
  deleteApiKeyFn,
  testApiKeyFn,
} from "~/fn/api-keys";
import { toast } from "sonner";

export function useApiKeyStatus() {
  return useQuery(getApiKeyStatusQuery());
}

export function useSaveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (apiKey: string) => saveApiKeyFn({ data: { apiKey } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key saved successfully");
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
    mutationFn: () => deleteApiKeyFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deleted successfully");
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
    mutationFn: () => testApiKeyFn(),
    onSuccess: () => {
      toast.success("API key is valid and working");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "API key test failed"
      );
    },
  });
}
