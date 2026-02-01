import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getUserInteractionProfile,
  getSimilarUsersInteractions,
  getCandidateArticles,
  getArticlesFromSimilarUsers,
  getUserTopicIds,
} from "~/data-access/recommendations";
import { findArticleById } from "~/data-access/articles";
import {
  findSimilarUsers,
  scoreArticlesFromSimilarUsers,
  generateFallbackRecommendations,
  combineRecommendations,
  type ArticleRecommendation,
} from "~/services/collaborative-filtering";
import type { Article } from "~/db/schema";

export interface RecommendedArticle extends Article {
  recommendationScore: number;
  recommendationReason: string;
  topicId: string;
  topicName: string;
}

export const getRecommendedArticlesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      limit: z.number().min(1).max(50).optional().default(10),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<RecommendedArticle[]> => {
    const { limit } = data;
    const userId = context.userId;

    // Step 1: Get user's interaction profile
    const userProfile = await getUserInteractionProfile(userId);
    const userArticleIds = new Set(
      userProfile.interactions.map((i) => i.articleId)
    );

    // Step 2: Get user's topic IDs
    const userTopicIds = await getUserTopicIds(userId);
    if (userTopicIds.length === 0) {
      return []; // User has no topics to recommend from
    }

    // Step 3: Get candidate articles (from user's topics, not yet interacted)
    const candidateArticles = await getCandidateArticles(
      userId,
      Array.from(userArticleIds),
      limit * 5 // Get more candidates for filtering
    );

    let recommendations: ArticleRecommendation[] = [];

    // Step 4: Try collaborative filtering if user has interaction history
    if (userProfile.interactions.length > 0) {
      // Find similar users
      const similarUsersProfiles = await getSimilarUsersInteractions(
        userId,
        Array.from(userArticleIds)
      );

      if (similarUsersProfiles.size > 0) {
        const similarUsers = findSimilarUsers(
          userProfile,
          similarUsersProfiles,
          0.1,
          20
        );

        if (similarUsers.length > 0) {
          // Get articles that similar users engaged with
          const similarUserIds = similarUsers.map((u) => u.userId);
          const articleEngagements = await getArticlesFromSimilarUsers(
            similarUserIds,
            Array.from(userArticleIds),
            userTopicIds,
            limit * 3
          );

          // Score articles based on similar users' engagement
          recommendations = scoreArticlesFromSimilarUsers(
            similarUsers,
            articleEngagements,
            userArticleIds
          );
        }
      }
    }

    // Step 5: Generate fallback recommendations if collaborative filtering didn't produce enough
    if (recommendations.length < limit) {
      const fallbackRecs = generateFallbackRecommendations(
        candidateArticles.map((a) => ({
          id: a.id,
          topicId: a.topicId,
          relevanceScore: a.relevanceScore,
          publishedAt: a.publishedAt,
        })),
        userArticleIds,
        limit
      );

      recommendations = combineRecommendations(
        recommendations,
        fallbackRecs,
        limit
      );
    }

    // Step 6: Fetch full article data for recommendations
    const recommendedArticles: RecommendedArticle[] = [];

    for (const rec of recommendations.slice(0, limit)) {
      const article = await findArticleById(rec.articleId);
      if (article) {
        // Find the topic name from candidate articles
        const candidateMatch = candidateArticles.find(
          (c) => c.id === rec.articleId && c.topicId === rec.topicId
        );

        recommendedArticles.push({
          ...article,
          recommendationScore: rec.score,
          recommendationReason: rec.reason,
          topicId: rec.topicId,
          topicName: candidateMatch?.topicName || "",
        });
      }
    }

    return recommendedArticles;
  });

export const getRecommendationStatsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const userId = context.userId;

    // Get user's interaction profile for stats
    const userProfile = await getUserInteractionProfile(userId);
    const userTopicIds = await getUserTopicIds(userId);

    const interactionCounts = {
      total: userProfile.interactions.length,
      clicks: userProfile.interactions.filter((i) => i.interactionType === "click")
        .length,
      helpful: userProfile.interactions.filter(
        (i) => i.interactionType === "helpful"
      ).length,
      notHelpful: userProfile.interactions.filter(
        (i) => i.interactionType === "not_helpful"
      ).length,
    };

    // Check if we have enough data for collaborative filtering
    const hasEnoughData = userProfile.interactions.length >= 3;
    const userArticleIds = new Set(
      userProfile.interactions.map((i) => i.articleId)
    );

    let similarUserCount = 0;
    if (hasEnoughData) {
      const similarUsersProfiles = await getSimilarUsersInteractions(
        userId,
        Array.from(userArticleIds)
      );
      similarUserCount = similarUsersProfiles.size;
    }

    return {
      topicCount: userTopicIds.length,
      interactionCounts,
      hasEnoughData,
      similarUserCount,
      recommendationMode: hasEnoughData && similarUserCount > 0
        ? "collaborative"
        : "relevance-based",
    };
  });
