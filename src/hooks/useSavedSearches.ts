import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createSavedSearchFn,
  updateSavedSearchFn,
  deleteSavedSearchFn,
} from "~/fn/saved-searches";
import {
  getSavedSearchesQuery,
  getSavedSearchByIdQuery,
} from "~/queries/saved-searches";
import { getErrorMessage } from "~/utils/error";
import { authClient } from "~/lib/auth-client";

// Query hooks
export function useSavedSearches(enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getSavedSearchesQuery(),
    enabled: enabled && !!session?.user,
  });
}

export function useSavedSearchById(id: string, enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getSavedSearchByIdQuery(id),
    enabled: enabled && !!id && !!session?.user,
  });
}

// Mutation hooks
export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createSavedSearchFn>[0]["data"]) =>
      createSavedSearchFn({ data }),
    onSuccess: (newSavedSearch) => {
      toast.success("Search saved!", {
        description: `"${newSavedSearch.name}" is ready for quick access.`,
      });

      queryClient.invalidateQueries({ queryKey: ["user-saved-searches"] });
    },
    onError: (error) => {
      toast.error("Failed to save search", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof updateSavedSearchFn>[0]["data"]) =>
      updateSavedSearchFn({ data }),
    onSuccess: (updatedSavedSearch, variables) => {
      toast.success("Saved search updated!", {
        description: `Changes to "${updatedSavedSearch.name}" have been saved.`,
      });

      queryClient.invalidateQueries({ queryKey: ["user-saved-searches"] });
      queryClient.invalidateQueries({ queryKey: ["saved-search", variables.id] });
    },
    onError: (error) => {
      toast.error("Failed to update saved search", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSavedSearchFn({ data: { id } }),
    onSuccess: (_, savedSearchId) => {
      toast.success("Saved search deleted", {
        description: "Your saved search has been permanently removed.",
      });

      queryClient.invalidateQueries({ queryKey: ["user-saved-searches"] });
      queryClient.removeQueries({ queryKey: ["saved-search", savedSearchId] });
    },
    onError: (error) => {
      toast.error("Failed to delete saved search", {
        description: getErrorMessage(error),
      });
    },
  });
}
