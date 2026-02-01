/**
 * Collaborative Filtering Service
 *
 * Implements user-based collaborative filtering to recommend articles:
 * 1. Build user interaction profiles from engagement data
 * 2. Calculate similarity between users using cosine similarity
 * 3. Score articles based on similar users' positive interactions
 * 4. Rank and filter recommendations
 */

import type { UserInteractionProfile } from "~/data-access/recommendations";

export interface UserSimilarity {
  userId: string;
  similarity: number;
}

export interface ArticleRecommendation {
  articleId: string;
  topicId: string;
  score: number;
  reason: string;
}

/**
 * Calculate cosine similarity between two users based on their article interactions
 */
export function calculateUserSimilarity(
  user1: UserInteractionProfile,
  user2: UserInteractionProfile
): number {
  // Build interaction maps for both users
  const user1Map = new Map<string, number>();
  const user2Map = new Map<string, number>();

  for (const i of user1.interactions) {
    const key = `${i.articleId}-${i.topicId}`;
    user1Map.set(key, (user1Map.get(key) || 0) + i.weight);
  }

  for (const i of user2.interactions) {
    const key = `${i.articleId}-${i.topicId}`;
    user2Map.set(key, (user2Map.get(key) || 0) + i.weight);
  }

  // Find common articles
  const commonKeys = new Set<string>();
  for (const key of user1Map.keys()) {
    if (user2Map.has(key)) {
      commonKeys.add(key);
    }
  }

  if (commonKeys.size === 0) {
    return 0;
  }

  // Calculate cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const key of commonKeys) {
    const v1 = user1Map.get(key) || 0;
    const v2 = user2Map.get(key) || 0;
    dotProduct += v1 * v2;
  }

  for (const v of user1Map.values()) {
    norm1 += v * v;
  }

  for (const v of user2Map.values()) {
    norm2 += v * v;
  }

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Find similar users based on interaction patterns
 */
export function findSimilarUsers(
  targetUser: UserInteractionProfile,
  otherUsers: Map<string, UserInteractionProfile>,
  minSimilarity: number = 0.1,
  maxUsers: number = 20
): UserSimilarity[] {
  const similarities: UserSimilarity[] = [];

  for (const [userId, profile] of otherUsers) {
    const similarity = calculateUserSimilarity(targetUser, profile);
    if (similarity >= minSimilarity) {
      similarities.push({ userId, similarity });
    }
  }

  // Sort by similarity (descending) and take top N
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxUsers);
}

/**
 * Score articles based on similar users' engagement
 */
export function scoreArticlesFromSimilarUsers(
  similarUsers: UserSimilarity[],
  articleEngagements: {
    articleId: string;
    topicId: string;
    totalWeight: number;
    interactionCount: number;
  }[],
  userArticleIds: Set<string>
): ArticleRecommendation[] {
  const recommendations: ArticleRecommendation[] = [];

  // Create a map of user similarity for quick lookup
  const similarityMap = new Map(
    similarUsers.map((u) => [u.userId, u.similarity])
  );
  const avgSimilarity =
    similarUsers.length > 0
      ? similarUsers.reduce((sum, u) => sum + u.similarity, 0) /
        similarUsers.length
      : 0;

  for (const engagement of articleEngagements) {
    // Skip if user already interacted with this article
    if (userArticleIds.has(engagement.articleId)) {
      continue;
    }

    // Score = engagement weight * average similarity
    // This gives higher scores to articles that similar users liked
    const score = engagement.totalWeight * (avgSimilarity + 0.1);

    // Generate reason based on engagement
    let reason = "Recommended based on similar users";
    if (engagement.interactionCount >= 3) {
      reason = `Popular among ${engagement.interactionCount} similar users`;
    } else if (engagement.totalWeight >= 5) {
      reason = "Highly rated by similar users";
    }

    recommendations.push({
      articleId: engagement.articleId,
      topicId: engagement.topicId,
      score: Math.round(score * 100) / 100,
      reason,
    });
  }

  // Sort by score (descending)
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Generate fallback recommendations when collaborative filtering has insufficient data
 * Uses article relevance scores and freshness
 */
export function generateFallbackRecommendations(
  candidateArticles: {
    id: string;
    topicId: string;
    relevanceScore: number | null;
    publishedAt: Date | null;
  }[],
  userArticleIds: Set<string>,
  limit: number = 10
): ArticleRecommendation[] {
  const now = new Date();

  return candidateArticles
    .filter((a) => !userArticleIds.has(a.id))
    .map((article) => {
      // Combine relevance score with freshness
      const relevance = article.relevanceScore || 0.5;

      // Freshness bonus (articles from last 7 days get higher scores)
      let freshnessBonus = 0;
      if (article.publishedAt) {
        const ageInDays =
          (now.getTime() - article.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays <= 1) freshnessBonus = 0.3;
        else if (ageInDays <= 3) freshnessBonus = 0.2;
        else if (ageInDays <= 7) freshnessBonus = 0.1;
      }

      const score = relevance + freshnessBonus;

      return {
        articleId: article.id,
        topicId: article.topicId,
        score: Math.round(score * 100) / 100,
        reason: "Highly relevant to your topics",
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Combine and deduplicate recommendations from different sources
 */
export function combineRecommendations(
  collaborativeRecs: ArticleRecommendation[],
  fallbackRecs: ArticleRecommendation[],
  limit: number = 10
): ArticleRecommendation[] {
  const seen = new Set<string>();
  const combined: ArticleRecommendation[] = [];

  // Prioritize collaborative filtering results
  for (const rec of collaborativeRecs) {
    if (!seen.has(rec.articleId)) {
      seen.add(rec.articleId);
      combined.push(rec);
    }
  }

  // Fill with fallback recommendations
  for (const rec of fallbackRecs) {
    if (!seen.has(rec.articleId)) {
      seen.add(rec.articleId);
      combined.push(rec);
    }
  }

  // Sort by score and limit
  return combined.sort((a, b) => b.score - a.score).slice(0, limit);
}
