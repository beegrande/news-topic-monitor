import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createCollectionFn,
  updateCollectionFn,
  deleteCollectionFn,
  addTopicToCollectionFn,
  removeTopicFromCollectionFn,
} from "~/fn/collections";
import {
  getCollectionsQuery,
  getCollectionByIdQuery,
} from "~/queries/collections";
import { getErrorMessage } from "~/utils/error";
import { authClient } from "~/lib/auth-client";

// Query hooks
export function useCollections(enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getCollectionsQuery(),
    enabled: enabled && !!session?.user,
  });
}

export function useCollectionById(id: string, enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getCollectionByIdQuery(id),
    enabled: enabled && !!id && !!session?.user,
  });
}

// Mutation hooks
export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createCollectionFn>[0]["data"]) =>
      createCollectionFn({ data }),
    onSuccess: (newCollection) => {
      toast.success("Collection created!", {
        description: `"${newCollection.name}" is ready for your topics.`,
      });

      queryClient.invalidateQueries({ queryKey: ["user-collections"] });
    },
    onError: (error) => {
      toast.error("Failed to create collection", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof updateCollectionFn>[0]["data"]) =>
      updateCollectionFn({ data }),
    onSuccess: (updatedCollection, variables) => {
      toast.success("Collection updated!", {
        description: `Changes to "${updatedCollection.name}" have been saved.`,
      });

      queryClient.invalidateQueries({ queryKey: ["user-collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to update collection", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCollectionFn({ data: { id } }),
    onSuccess: (_, collectionId) => {
      toast.success("Collection deleted", {
        description: "Your collection has been permanently removed.",
      });

      queryClient.invalidateQueries({ queryKey: ["user-collections"] });
      queryClient.removeQueries({ queryKey: ["collection", collectionId] });
    },
    onError: (error) => {
      toast.error("Failed to delete collection", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useAddTopicToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { collectionId: string; topicId: string }) =>
      addTopicToCollectionFn({ data }),
    onSuccess: (_, { collectionId }) => {
      toast.success("Topic added to collection!");

      queryClient.invalidateQueries({ queryKey: ["collection", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["user-collections"] });
    },
    onError: (error) => {
      toast.error("Failed to add topic to collection", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useRemoveTopicFromCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { collectionId: string; topicId: string }) =>
      removeTopicFromCollectionFn({ data }),
    onSuccess: (_, { collectionId }) => {
      toast.success("Topic removed from collection");

      queryClient.invalidateQueries({ queryKey: ["collection", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["user-collections"] });
    },
    onError: (error) => {
      toast.error("Failed to remove topic from collection", {
        description: getErrorMessage(error),
      });
    },
  });
}
