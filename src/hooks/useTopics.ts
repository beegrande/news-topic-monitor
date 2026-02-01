import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createTopicFn,
  updateTopicFn,
  deleteTopicFn,
  setTopicStatusFn,
  toggleTopicPublicFn,
  generateShareLinkFn,
  revokeShareLinkFn,
  getTopicCollaboratorsFn,
  addCollaboratorFn,
  removeCollaboratorFn,
  moveTopicFn,
  exportTopicsFn,
  importTopicsFn,
} from "~/fn/topics";
import {
  getUserTopicsQuery,
  getTopicByIdQuery,
  getTopicHierarchyQuery,
  getTopicAncestorsQuery,
  getAvailableParentTopicsQuery,
  getTrendingTopicsQuery,
} from "~/queries/topics";
import { getErrorMessage } from "~/utils/error";
import { authClient } from "~/lib/auth-client";

// Query hooks
export function useTopics(enabled = true, options?: { refetchInterval?: number }) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getUserTopicsQuery(),
    enabled: enabled && !!session?.user,
    refetchInterval: options?.refetchInterval,
  });
}

export function useTopicById(id: string, enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getTopicByIdQuery(id),
    enabled: enabled && !!id && !!session?.user,
  });
}

// Mutation hooks

export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createTopicFn>[0]["data"]) =>
      createTopicFn({ data }),
    onSuccess: () => {
      toast.success("Topic created successfully!", {
        description: "Your topic is now being monitored for news.",
      });
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics-count"] });
    },
    onError: (error) => {
      toast.error("Failed to create topic", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof updateTopicFn>[0]["data"]) =>
      updateTopicFn({ data }),
    onSuccess: (topic) => {
      toast.success("Topic updated successfully!", {
        description: "Your changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["topic", topic.id] });
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
    },
    onError: (error) => {
      toast.error("Failed to update topic", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTopicFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Topic deleted successfully", {
        description: "The topic has been permanently removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics-count"] });
    },
    onError: (error) => {
      toast.error("Failed to delete topic", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useSetTopicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "active" | "paused" | "archived";
    }) => setTopicStatusFn({ data: { id, status } }),
    onSuccess: (topic) => {
      const messages: Record<string, { title: string; description: string }> = {
        active: {
          title: "Topic activated",
          description: "Monitoring has been resumed for this topic.",
        },
        paused: {
          title: "Topic paused",
          description: "Monitoring has been paused for this topic.",
        },
        archived: {
          title: "Topic archived",
          description: "This topic has been archived.",
        },
      };
      const msg = messages[topic.status] || messages.active;
      toast.success(msg.title, { description: msg.description });
      queryClient.invalidateQueries({ queryKey: ["topic", topic.id] });
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
    },
    onError: (error) => {
      toast.error("Failed to update topic status", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Sharing hooks
export function useToggleTopicPublic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      toggleTopicPublicFn({ data: { id, isPublic } }),
    onSuccess: (topic) => {
      const message = topic?.isPublic
        ? "Topic is now public"
        : "Topic is now private";
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["topic", topic?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
    },
    onError: (error) => {
      toast.error("Failed to update topic visibility", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useGenerateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => generateShareLinkFn({ data: { id } }),
    onSuccess: (topic) => {
      toast.success("Share link generated");
      queryClient.invalidateQueries({ queryKey: ["topic", topic?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
    },
    onError: (error) => {
      toast.error("Failed to generate share link", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useRevokeShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeShareLinkFn({ data: { id } }),
    onSuccess: (topic) => {
      toast.success("Share link revoked");
      queryClient.invalidateQueries({ queryKey: ["topic", topic?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
    },
    onError: (error) => {
      toast.error("Failed to revoke share link", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useTopicCollaborators(topicId: string, enabled = true) {
  return useQuery({
    queryKey: ["topic-collaborators", topicId],
    queryFn: () => getTopicCollaboratorsFn({ data: { topicId } }),
    enabled: enabled && !!topicId,
  });
}

export function useAddCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { topicId: string; userId: string; permission?: "view" | "edit" }) =>
      addCollaboratorFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Collaborator added");
      queryClient.invalidateQueries({ queryKey: ["topic-collaborators", variables.topicId] });
    },
    onError: (error) => {
      toast.error("Failed to add collaborator", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useRemoveCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { topicId: string; userId: string }) =>
      removeCollaboratorFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Collaborator removed");
      queryClient.invalidateQueries({ queryKey: ["topic-collaborators", variables.topicId] });
    },
    onError: (error) => {
      toast.error("Failed to remove collaborator", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Topic hierarchy hooks
export function useTopicHierarchy(enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getTopicHierarchyQuery(),
    enabled: enabled && !!session?.user,
  });
}

export function useTopicAncestors(id: string, enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getTopicAncestorsQuery(id),
    enabled: enabled && !!id && !!session?.user,
  });
}

export function useAvailableParentTopics(excludeId?: string, enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getAvailableParentTopicsQuery(excludeId),
    enabled: enabled && !!session?.user,
  });
}

export function useMoveTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; parentId: string | null; position?: number }) =>
      moveTopicFn({ data }),
    onSuccess: () => {
      toast.success("Topic moved successfully");
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
      queryClient.invalidateQueries({ queryKey: ["topic-hierarchy"] });
    },
    onError: (error) => {
      toast.error("Failed to move topic", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Export/Import hooks
export function useExportTopics() {
  return useMutation({
    mutationFn: (topicIds?: string[]) => exportTopicsFn({ data: { topicIds } }),
    onError: (error) => {
      toast.error("Failed to export topics", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useImportTopics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      topics: Array<{
        name: string;
        description?: string | null;
        keywords: string;
        monitoringFrequency?: "hourly" | "daily" | "weekly";
        includedSources?: string | null;
        excludedSources?: string | null;
        languages?: string | null;
        notificationEnabled?: boolean;
        notificationFrequency?: "daily" | "weekly" | "none";
        minimumRelevanceScore?: number;
      }>;
      skipDuplicates?: boolean;
    }) => importTopicsFn({ data }),
    onSuccess: (result) => {
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} topic${result.imported !== 1 ? "s" : ""}`, {
          description: result.skipped > 0 ? `${result.skipped} skipped (duplicates)` : undefined,
        });
      } else if (result.skipped > 0) {
        toast.info("No topics imported", {
          description: `${result.skipped} topic${result.skipped !== 1 ? "s" : ""} skipped (duplicates)`,
        });
      }
      if (result.errors.length > 0) {
        toast.error("Some topics failed to import", {
          description: result.errors[0],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics-count"] });
    },
    onError: (error) => {
      toast.error("Failed to import topics", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Trending topics hook (no auth required)
export function useTrendingTopics(limit?: number, enabled = true) {
  return useQuery({
    ...getTrendingTopicsQuery(limit),
    enabled,
  });
}
