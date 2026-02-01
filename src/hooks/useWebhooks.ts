import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWebhooksQuery, getWebhookByIdQuery } from "~/queries/webhooks";
import {
  createWebhookFn,
  updateWebhookFn,
  deleteWebhookFn,
  testWebhookFn,
} from "~/fn/webhooks";
import { toast } from "sonner";

export function useWebhooks() {
  return useQuery(getWebhooksQuery());
}

export function useWebhook(id: string) {
  return useQuery(getWebhookByIdQuery(id));
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      url: string;
      topicId?: string | null;
      secret?: string | null;
      isEnabled?: boolean;
    }) => createWebhookFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create webhook"
      );
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      name?: string;
      url?: string;
      topicId?: string | null;
      secret?: string | null;
      isEnabled?: boolean;
    }) => updateWebhookFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["webhooks", variables.id] });
      toast.success("Webhook updated successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update webhook"
      );
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWebhookFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete webhook"
      );
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) => testWebhookFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Test webhook sent successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to send test webhook"
      );
    },
  });
}
