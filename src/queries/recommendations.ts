import { queryOptions } from "@tanstack/react-query";
import {
  getRecommendedArticlesFn,
  getRecommendationStatsFn,
} from "~/fn/recommendations";

export interface GetRecommendedArticlesParams {
  limit?: number;
}

export const getRecommendedArticlesQuery = (
  params: GetRecommendedArticlesParams = {}
) =>
  queryOptions({
    queryKey: ["recommended-articles", params.limit],
    queryFn: () => getRecommendedArticlesFn({ data: params }),
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });

export const getRecommendationStatsQuery = () =>
  queryOptions({
    queryKey: ["recommendation-stats"],
    queryFn: () => getRecommendationStatsFn(),
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });
