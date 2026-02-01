import { useQuery } from "@tanstack/react-query";
import { authClient } from "~/lib/auth-client";
import {
  getRecommendedArticlesQuery,
  getRecommendationStatsQuery,
  type GetRecommendedArticlesParams,
} from "~/queries/recommendations";

export function useRecommendedArticles(params: GetRecommendedArticlesParams = {}) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getRecommendedArticlesQuery(params),
    enabled: !!session?.user,
  });
}

export function useRecommendationStats() {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getRecommendationStatsQuery(),
    enabled: !!session?.user,
  });
}
