import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  submitSourceFeedbackFn,
  deleteSourceFeedbackFn,
  getOrCreateSourceCredibilityFn,
} from "~/fn/source-credibility";
import {
  getSourceCredibilityQuery,
  getAllSourceCredibilitiesQuery,
  getSourceCredibilityOverviewQuery,
  getUserSourceFeedbackQuery,
  getSourceFeedbackListQuery,
  type GetAllSourceCredibilitiesParams,
  type GetSourceFeedbackListParams,
} from "~/queries/source-credibility";
import { getErrorMessage } from "~/utils/error";

/**
 * Get credibility information for a specific source.
 */
export function useSourceCredibility(sourceName: string) {
  return useQuery({
    ...getSourceCredibilityQuery(sourceName),
    enabled: !!sourceName,
  });
}

/**
 * Get all source credibility records.
 */
export function useAllSourceCredibilities(
  params: GetAllSourceCredibilitiesParams = {}
) {
  return useQuery(getAllSourceCredibilitiesQuery(params));
}

/**
 * Get overview of top/lowest rated sources and stats.
 */
export function useSourceCredibilityOverview(limit?: number) {
  return useQuery(getSourceCredibilityOverviewQuery(limit));
}

/**
 * Get current user's feedback for a source.
 */
export function useUserSourceFeedback(sourceName: string) {
  return useQuery({
    ...getUserSourceFeedbackQuery(sourceName),
    enabled: !!sourceName,
  });
}

/**
 * Get all feedback for a source.
 */
export function useSourceFeedbackList(params: GetSourceFeedbackListParams) {
  return useQuery({
    ...getSourceFeedbackListQuery(params),
    enabled: !!params.sourceName,
  });
}

/**
 * Ensure a source credibility record exists.
 * Used when displaying articles to make sure we have credibility data.
 */
export function useEnsureSourceCredibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceName: string) =>
      getOrCreateSourceCredibilityFn({ data: { sourceName } }),
    onSuccess: (_, sourceName) => {
      // Invalidate to refresh credibility data
      queryClient.invalidateQueries({
        queryKey: ["source-credibility", sourceName],
      });
    },
  });
}

/**
 * Submit feedback for a source.
 */
export function useSubmitSourceFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      sourceName: string;
      rating: number;
      feedback?: string;
    }) => submitSourceFeedbackFn({ data }),
    onSuccess: (result, variables) => {
      toast.success("Feedback submitted", {
        description: `Your rating for "${variables.sourceName}" has been saved.`,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["source-credibility", variables.sourceName],
      });
      queryClient.invalidateQueries({
        queryKey: ["user-source-feedback", variables.sourceName],
      });
      queryClient.invalidateQueries({
        queryKey: ["source-feedback-list", variables.sourceName],
      });
      queryClient.invalidateQueries({
        queryKey: ["source-credibility-overview"],
      });
      queryClient.invalidateQueries({
        queryKey: ["source-credibilities"],
      });
    },
    onError: (error) => {
      toast.error("Failed to submit feedback", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Delete user's feedback for a source.
 */
export function useDeleteSourceFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceName: string) =>
      deleteSourceFeedbackFn({ data: { sourceName } }),
    onSuccess: (_, sourceName) => {
      toast.success("Feedback removed", {
        description: `Your rating for "${sourceName}" has been removed.`,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["source-credibility", sourceName],
      });
      queryClient.invalidateQueries({
        queryKey: ["user-source-feedback", sourceName],
      });
      queryClient.invalidateQueries({
        queryKey: ["source-feedback-list", sourceName],
      });
      queryClient.invalidateQueries({
        queryKey: ["source-credibility-overview"],
      });
      queryClient.invalidateQueries({
        queryKey: ["source-credibilities"],
      });
    },
    onError: (error) => {
      toast.error("Failed to remove feedback", {
        description: getErrorMessage(error),
      });
    },
  });
}
