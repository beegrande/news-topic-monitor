import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchNewsForTopicFn,
  recordArticleClickFn,
  submitArticleFeedbackFn,
  removeArticleFeedbackFn,
  checkArticleFactsFn,
} from "~/fn/articles";
import {
  createArticleCommentFn,
  updateArticleCommentFn,
  deleteArticleCommentFn,
} from "~/fn/article-comments";
import {
  getArticlesByTopicQuery,
  getArticleSourcesQuery,
  getArticleSourcesAllQuery,
  getArticleSentimentsQuery,
  getArticleCountriesQuery,
  getCountryDistributionQuery,
  getNewsRateLimitStatusQuery,
  searchArticlesQuery,
  getArticleFeedbackQuery,
  getClusteredArticlesQuery,
  getArticleCommentsQuery,
  getFactCheckStatusQuery,
  getFactCheckRateLimitQuery,
  type GetArticlesByTopicParams,
  type SearchArticlesParams,
  type GetClusteredArticlesParams,
  type GetArticleCommentsParams,
} from "~/queries/articles";
import { getErrorMessage } from "~/utils/error";

export function useArticlesByTopic(params: GetArticlesByTopicParams) {
  return useQuery(getArticlesByTopicQuery(params));
}

export function useArticleSources(topicId: string) {
  return useQuery(getArticleSourcesQuery(topicId));
}

export function useNewsRateLimitStatus() {
  return useQuery(getNewsRateLimitStatusQuery());
}

export function useFetchNewsForTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { topicId: string; pageSize?: number }) =>
      fetchNewsForTopicFn({ data }),
    onSuccess: (result, variables) => {
      toast.success("News fetched successfully!", {
        description: `Found ${result.newArticles} new articles and ${result.existingArticles} existing articles.`,
      });
      // Invalidate article queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["topic-articles", variables.topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["article-sources", variables.topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["article-sentiments", variables.topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["news-rate-limit"],
      });
    },
    onError: (error) => {
      toast.error("Failed to fetch news", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useSearchArticles(params: SearchArticlesParams) {
  return useQuery(searchArticlesQuery(params));
}

export function useArticleSourcesAll() {
  return useQuery(getArticleSourcesAllQuery());
}

export function useArticleSentiments(topicId: string) {
  return useQuery(getArticleSentimentsQuery(topicId));
}

export function useArticleCountries(topicId: string) {
  return useQuery(getArticleCountriesQuery(topicId));
}

export function useCountryDistribution(topicId: string) {
  return useQuery(getCountryDistributionQuery(topicId));
}

export function useArticleFeedback(articleId: string, topicId: string) {
  return useQuery(getArticleFeedbackQuery(articleId, topicId));
}

export function useRecordArticleClick() {
  return useMutation({
    mutationFn: (data: { articleId: string; topicId: string }) =>
      recordArticleClickFn({ data }),
  });
}

export function useSubmitArticleFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      articleId: string;
      topicId: string;
      feedback: "helpful" | "not_helpful";
    }) => submitArticleFeedbackFn({ data }),
    onSuccess: (_, variables) => {
      // Invalidate feedback query for this article
      queryClient.invalidateQueries({
        queryKey: ["article-feedback", variables.articleId, variables.topicId],
      });
      // Invalidate articles list to reflect updated relevance score
      queryClient.invalidateQueries({
        queryKey: ["topic-articles", variables.topicId],
      });
    },
    onError: (error) => {
      toast.error("Failed to submit feedback", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useRemoveArticleFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { articleId: string; topicId: string }) =>
      removeArticleFeedbackFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["article-feedback", variables.articleId, variables.topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topic-articles", variables.topicId],
      });
    },
    onError: (error) => {
      toast.error("Failed to remove feedback", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useClusteredArticles(params: GetClusteredArticlesParams) {
  return useQuery(getClusteredArticlesQuery(params));
}

export function useArticleComments(params: GetArticleCommentsParams) {
  return useQuery(getArticleCommentsQuery(params));
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { articleId: string; topicId: string; content: string }) =>
      createArticleCommentFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["article-comments", variables.articleId, variables.topicId],
      });
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error("Failed to add comment", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { commentId: string; content: string; articleId: string; topicId: string }) =>
      updateArticleCommentFn({ data: { commentId: data.commentId, content: data.content } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["article-comments", variables.articleId, variables.topicId],
      });
      toast.success("Comment updated");
    },
    onError: (error) => {
      toast.error("Failed to update comment", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { commentId: string; articleId: string; topicId: string }) =>
      deleteArticleCommentFn({ data: { commentId: data.commentId } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["article-comments", variables.articleId, variables.topicId],
      });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete comment", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useFactCheckStatus(articleId: string) {
  return useQuery(getFactCheckStatusQuery(articleId));
}

export function useFactCheckRateLimit() {
  return useQuery(getFactCheckRateLimitQuery());
}

export function useCheckArticleFacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { articleId: string; topicId: string }) =>
      checkArticleFactsFn({ data }),
    onSuccess: (result, variables) => {
      if (result.claims.length > 0) {
        toast.success("Fact-check complete", {
          description: `Found ${result.claims.length} related fact-check(s). Credibility: ${result.credibilityScore}%`,
        });
      } else {
        toast.success("Fact-check complete", {
          description: "No fact-checks found for this article.",
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["fact-check-status", variables.articleId],
      });
      queryClient.invalidateQueries({
        queryKey: ["fact-check-rate-limit"],
      });
      queryClient.invalidateQueries({
        queryKey: ["topic-articles", variables.topicId],
      });
    },
    onError: (error) => {
      toast.error("Failed to check facts", {
        description: getErrorMessage(error),
      });
    },
  });
}
