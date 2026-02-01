import { eq, and, sql, desc } from "drizzle-orm";
import { database } from "~/db";
import {
  articleInteraction,
  type ArticleInteraction,
  type CreateArticleInteractionData,
  type InteractionType,
} from "~/db/schema";

export async function createArticleInteraction(
  data: CreateArticleInteractionData
): Promise<ArticleInteraction> {
  const [interaction] = await database
    .insert(articleInteraction)
    .values(data)
    .returning();

  return interaction;
}

export async function findInteractionById(
  id: string
): Promise<ArticleInteraction | null> {
  const [result] = await database
    .select()
    .from(articleInteraction)
    .where(eq(articleInteraction.id, id))
    .limit(1);

  return result || null;
}

export async function findUserInteraction(
  userId: string,
  articleId: string,
  topicId: string,
  interactionType: InteractionType
): Promise<ArticleInteraction | null> {
  const [result] = await database
    .select()
    .from(articleInteraction)
    .where(
      and(
        eq(articleInteraction.userId, userId),
        eq(articleInteraction.articleId, articleId),
        eq(articleInteraction.topicId, topicId),
        eq(articleInteraction.interactionType, interactionType)
      )
    )
    .limit(1);

  return result || null;
}

export async function deleteInteraction(id: string): Promise<boolean> {
  const result = await database
    .delete(articleInteraction)
    .where(eq(articleInteraction.id, id))
    .returning();

  return result.length > 0;
}

export async function deleteUserFeedback(
  userId: string,
  articleId: string,
  topicId: string
): Promise<boolean> {
  const result = await database
    .delete(articleInteraction)
    .where(
      and(
        eq(articleInteraction.userId, userId),
        eq(articleInteraction.articleId, articleId),
        eq(articleInteraction.topicId, topicId),
        sql`${articleInteraction.interactionType} IN ('helpful', 'not_helpful')`
      )
    )
    .returning();

  return result.length > 0;
}

export interface FeedbackCounts {
  helpfulCount: number;
  notHelpfulCount: number;
}

export async function getArticleFeedbackCounts(
  articleId: string,
  topicId: string
): Promise<FeedbackCounts> {
  const [result] = await database
    .select({
      helpfulCount: sql<number>`COUNT(*) FILTER (WHERE ${articleInteraction.interactionType} = 'helpful')`,
      notHelpfulCount: sql<number>`COUNT(*) FILTER (WHERE ${articleInteraction.interactionType} = 'not_helpful')`,
    })
    .from(articleInteraction)
    .where(
      and(
        eq(articleInteraction.articleId, articleId),
        eq(articleInteraction.topicId, topicId)
      )
    );

  return {
    helpfulCount: Number(result?.helpfulCount || 0),
    notHelpfulCount: Number(result?.notHelpfulCount || 0),
  };
}

export async function getUserFeedbackForArticle(
  userId: string,
  articleId: string,
  topicId: string
): Promise<InteractionType | null> {
  const [result] = await database
    .select({ interactionType: articleInteraction.interactionType })
    .from(articleInteraction)
    .where(
      and(
        eq(articleInteraction.userId, userId),
        eq(articleInteraction.articleId, articleId),
        eq(articleInteraction.topicId, topicId),
        sql`${articleInteraction.interactionType} IN ('helpful', 'not_helpful')`
      )
    )
    .limit(1);

  return (result?.interactionType as InteractionType) || null;
}

export async function recordClick(
  userId: string,
  articleId: string,
  topicId: string
): Promise<ArticleInteraction> {
  return createArticleInteraction({
    id: crypto.randomUUID(),
    userId,
    articleId,
    topicId,
    interactionType: "click",
  });
}

export async function getArticleClickCount(
  articleId: string,
  topicId: string
): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)` })
    .from(articleInteraction)
    .where(
      and(
        eq(articleInteraction.articleId, articleId),
        eq(articleInteraction.topicId, topicId),
        eq(articleInteraction.interactionType, "click")
      )
    );

  return Number(result?.count || 0);
}

export async function getRecentInteractionsByUser(
  userId: string,
  limit: number = 50
): Promise<ArticleInteraction[]> {
  return await database
    .select()
    .from(articleInteraction)
    .where(eq(articleInteraction.userId, userId))
    .orderBy(desc(articleInteraction.createdAt))
    .limit(limit);
}
