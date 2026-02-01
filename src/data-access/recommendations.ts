import { eq, and, sql, desc, ne, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  articleInteraction,
  articleTopic,
  article,
  topic,
  type Article,
} from "~/db/schema";

export interface UserInteractionProfile {
  userId: string;
  interactions: {
    articleId: string;
    topicId: string;
    interactionType: string;
    weight: number;
  }[];
}

export interface ArticleWithRelevance extends Article {
  relevanceScore: number | null;
  topicId: string;
  topicName: string;
}

/**
 * Get all interactions for a user (for building their profile)
 */
export async function getUserInteractionProfile(
  userId: string
): Promise<UserInteractionProfile> {
  const interactions = await database
    .select({
      articleId: articleInteraction.articleId,
      topicId: articleInteraction.topicId,
      interactionType: articleInteraction.interactionType,
    })
    .from(articleInteraction)
    .where(eq(articleInteraction.userId, userId))
    .orderBy(desc(articleInteraction.createdAt));

  // Assign weights: click=1, helpful=3, not_helpful=-1
  const weightedInteractions = interactions.map((i) => ({
    ...i,
    weight:
      i.interactionType === "helpful"
        ? 3
        : i.interactionType === "not_helpful"
          ? -1
          : 1,
  }));

  return {
    userId,
    interactions: weightedInteractions,
  };
}

/**
 * Get interactions from all users who have interacted with the same articles as the target user
 */
export async function getSimilarUsersInteractions(
  userId: string,
  userArticleIds: string[]
): Promise<Map<string, UserInteractionProfile>> {
  if (userArticleIds.length === 0) {
    return new Map();
  }

  // Find users who have interacted with the same articles
  const similarUsersInteractions = await database
    .select({
      userId: articleInteraction.userId,
      articleId: articleInteraction.articleId,
      topicId: articleInteraction.topicId,
      interactionType: articleInteraction.interactionType,
    })
    .from(articleInteraction)
    .where(
      and(
        ne(articleInteraction.userId, userId),
        inArray(articleInteraction.articleId, userArticleIds)
      )
    );

  // Group by user
  const userProfiles = new Map<string, UserInteractionProfile>();

  for (const interaction of similarUsersInteractions) {
    if (!userProfiles.has(interaction.userId)) {
      userProfiles.set(interaction.userId, {
        userId: interaction.userId,
        interactions: [],
      });
    }

    const profile = userProfiles.get(interaction.userId)!;
    profile.interactions.push({
      articleId: interaction.articleId,
      topicId: interaction.topicId,
      interactionType: interaction.interactionType,
      weight:
        interaction.interactionType === "helpful"
          ? 3
          : interaction.interactionType === "not_helpful"
            ? -1
            : 1,
    });
  }

  return userProfiles;
}

/**
 * Get candidate articles for recommendations (from topics user monitors)
 * Excludes articles the user has already interacted with
 */
export async function getCandidateArticles(
  userId: string,
  excludeArticleIds: string[],
  limit: number = 50
): Promise<ArticleWithRelevance[]> {
  // Get user's topic IDs
  const userTopics = await database
    .select({ id: topic.id, name: topic.name })
    .from(topic)
    .where(eq(topic.userId, userId));

  if (userTopics.length === 0) {
    return [];
  }

  const topicIds = userTopics.map((t) => t.id);
  const topicNameMap = new Map(userTopics.map((t) => [t.id, t.name]));

  // Build query for candidate articles
  let query = database
    .select({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      source: article.source,
      url: article.url,
      publishedAt: article.publishedAt,
      sentiment: article.sentiment,
      sentimentScore: article.sentimentScore,
      contentHash: article.contentHash,
      factCheckStatus: article.factCheckStatus,
      credibilityScore: article.credibilityScore,
      factCheckSources: article.factCheckSources,
      factCheckedAt: article.factCheckedAt,
      isArchived: article.isArchived,
      archivedAt: article.archivedAt,
      fetchedAt: article.fetchedAt,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      relevanceScore: articleTopic.relevanceScore,
      topicId: articleTopic.topicId,
    })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(
      and(
        inArray(articleTopic.topicId, topicIds),
        eq(article.isArchived, false),
        excludeArticleIds.length > 0
          ? sql`${article.id} NOT IN (${sql.join(
              excludeArticleIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          : sql`1=1`
      )
    )
    .orderBy(desc(article.publishedAt))
    .limit(limit);

  const results = await query;

  return results.map((r) => ({
    ...r,
    topicName: topicNameMap.get(r.topicId) || "",
  }));
}

/**
 * Get articles that similar users have positively interacted with
 * (helpful or click) that the target user hasn't seen
 */
export async function getArticlesFromSimilarUsers(
  similarUserIds: string[],
  excludeArticleIds: string[],
  userTopicIds: string[],
  limit: number = 50
): Promise<
  {
    articleId: string;
    topicId: string;
    totalWeight: number;
    interactionCount: number;
  }[]
> {
  if (similarUserIds.length === 0 || userTopicIds.length === 0) {
    return [];
  }

  // Get positive interactions from similar users
  const interactions = await database
    .select({
      articleId: articleInteraction.articleId,
      topicId: articleInteraction.topicId,
      interactionType: articleInteraction.interactionType,
    })
    .from(articleInteraction)
    .innerJoin(
      articleTopic,
      and(
        eq(articleInteraction.articleId, articleTopic.articleId),
        eq(articleInteraction.topicId, articleTopic.topicId)
      )
    )
    .where(
      and(
        inArray(articleInteraction.userId, similarUserIds),
        inArray(articleInteraction.topicId, userTopicIds),
        excludeArticleIds.length > 0
          ? sql`${articleInteraction.articleId} NOT IN (${sql.join(
              excludeArticleIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          : sql`1=1`
      )
    );

  // Aggregate by article
  const articleScores = new Map<
    string,
    { topicId: string; totalWeight: number; count: number }
  >();

  for (const interaction of interactions) {
    const key = `${interaction.articleId}-${interaction.topicId}`;
    const weight =
      interaction.interactionType === "helpful"
        ? 3
        : interaction.interactionType === "not_helpful"
          ? -1
          : 1;

    if (!articleScores.has(key)) {
      articleScores.set(key, {
        topicId: interaction.topicId,
        totalWeight: 0,
        count: 0,
      });
    }

    const score = articleScores.get(key)!;
    score.totalWeight += weight;
    score.count++;
  }

  // Convert to array and sort by score
  const results = Array.from(articleScores.entries())
    .map(([key, value]) => ({
      articleId: key.split("-")[0],
      topicId: value.topicId,
      totalWeight: value.totalWeight,
      interactionCount: value.count,
    }))
    .filter((r) => r.totalWeight > 0) // Only positive recommendations
    .sort((a, b) => b.totalWeight - a.totalWeight)
    .slice(0, limit);

  return results;
}

/**
 * Get user's monitored topic IDs
 */
export async function getUserTopicIds(userId: string): Promise<string[]> {
  const userTopics = await database
    .select({ id: topic.id })
    .from(topic)
    .where(eq(topic.userId, userId));

  return userTopics.map((t) => t.id);
}
