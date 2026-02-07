import { queryOptions } from "@tanstack/react-query";
import {
  getArticlesByTopicFn,
  getArticleByIdFn,
  getArticleSourcesFn,
  getArticleSourcesAllFn,
  getArticleSentimentsFn,
  getArticleCountriesFn,
  getCountryDistributionFn,
  getNewsRateLimitStatusFn,
  searchArticlesFn,
  getArticleFeedbackFn,
  getTopicAnalyticsFn,
  getClusteredArticlesFn,
  getFactCheckStatusFn,
  getFactCheckRateLimitFn,
} from "~/fn/articles";
import { getArticleCommentsFn } from "~/fn/article-comments";
import type { ArticleSentiment } from "~/db/schema";

export interface GetArticlesByTopicParams {
  topicId: string;
  limit?: number;
  offset?: number;
  sortBy?: "date" | "source" | "relevance";
  sortOrder?: "asc" | "desc";
  source?: string;
  sentiment?: ArticleSentiment;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const getArticlesByTopicQuery = (params: GetArticlesByTopicParams) =>
  queryOptions({
    queryKey: [
      "topic-articles",
      params.topicId,
      params.limit,
      params.offset,
      params.sortBy,
      params.sortOrder,
      params.source,
      params.sentiment,
      params.country,
      params.dateFrom,
      params.dateTo,
    ],
    queryFn: () => getArticlesByTopicFn({ data: params }),
  });

export const getArticleByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["article", id],
    queryFn: () => getArticleByIdFn({ data: { id } }),
  });

export const getArticleSourcesQuery = (topicId: string) =>
  queryOptions({
    queryKey: ["article-sources", topicId],
    queryFn: () => getArticleSourcesFn({ data: { topicId } }),
  });

export const getNewsRateLimitStatusQuery = () =>
  queryOptions({
    queryKey: ["news-rate-limit"],
    queryFn: () => getNewsRateLimitStatusFn(),
    staleTime: 30 * 1000, // Consider stale after 30 seconds
  });

export interface SearchArticlesParams {
  query: string;
  topicIds?: string[];
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const searchArticlesQuery = (params: SearchArticlesParams) =>
  queryOptions({
    queryKey: [
      "search-articles",
      params.query,
      params.topicIds,
      params.source,
      params.dateFrom,
      params.dateTo,
      params.limit,
      params.offset,
    ],
    queryFn: () => searchArticlesFn({ data: params }),
    enabled: params.query.length > 0,
  });

export const getArticleSourcesAllQuery = () =>
  queryOptions({
    queryKey: ["article-sources-all"],
    queryFn: () => getArticleSourcesAllFn(),
  });

export const getArticleSentimentsQuery = (topicId: string) =>
  queryOptions({
    queryKey: ["article-sentiments", topicId],
    queryFn: () => getArticleSentimentsFn({ data: { topicId } }),
  });

export const getArticleCountriesQuery = (topicId: string) =>
  queryOptions({
    queryKey: ["article-countries", topicId],
    queryFn: () => getArticleCountriesFn({ data: { topicId } }),
  });

export const getCountryDistributionQuery = (topicId: string) =>
  queryOptions({
    queryKey: ["country-distribution", topicId],
    queryFn: () => getCountryDistributionFn({ data: { topicId } }),
  });

export const getArticleFeedbackQuery = (articleId: string, topicId: string) =>
  queryOptions({
    queryKey: ["article-feedback", articleId, topicId],
    queryFn: () => getArticleFeedbackFn({ data: { articleId, topicId } }),
  });

export interface GetTopicAnalyticsParams {
  topicId: string;
  days?: number;
}

export const getTopicAnalyticsQuery = (params: GetTopicAnalyticsParams) =>
  queryOptions({
    queryKey: ["topic-analytics", params.topicId, params.days],
    queryFn: () => getTopicAnalyticsFn({ data: params }),
  });

export interface GetClusteredArticlesParams {
  topicId: string;
  limit?: number;
  similarityThreshold?: number;
}

export const getClusteredArticlesQuery = (params: GetClusteredArticlesParams) =>
  queryOptions({
    queryKey: ["clustered-articles", params.topicId, params.limit, params.similarityThreshold],
    queryFn: () => getClusteredArticlesFn({ data: params }),
  });

export interface GetArticleCommentsParams {
  articleId: string;
  topicId: string;
  limit?: number;
}

export const getArticleCommentsQuery = (params: GetArticleCommentsParams) =>
  queryOptions({
    queryKey: ["article-comments", params.articleId, params.topicId],
    queryFn: () => getArticleCommentsFn({ data: params }),
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });

export const getFactCheckStatusQuery = (articleId: string) =>
  queryOptions({
    queryKey: ["fact-check-status", articleId],
    queryFn: () => getFactCheckStatusFn({ data: { articleId } }),
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });

export const getFactCheckRateLimitQuery = () =>
  queryOptions({
    queryKey: ["fact-check-rate-limit"],
    queryFn: () => getFactCheckRateLimitFn(),
    staleTime: 30 * 1000, // Consider stale after 30 seconds
  });
