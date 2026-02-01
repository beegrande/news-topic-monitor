import { eq, and, desc, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  sourceFeedback,
  sourceCredibility,
  user,
  type SourceFeedback,
  type CreateSourceFeedbackData,
  type UpdateSourceFeedbackData,
} from "~/db/schema";

export async function findSourceFeedbackById(
  id: string
): Promise<SourceFeedback | null> {
  const [result] = await database
    .select()
    .from(sourceFeedback)
    .where(eq(sourceFeedback.id, id))
    .limit(1);

  return result || null;
}

export async function findUserSourceFeedback(
  userId: string,
  sourceCredibilityId: string
): Promise<SourceFeedback | null> {
  const [result] = await database
    .select()
    .from(sourceFeedback)
    .where(
      and(
        eq(sourceFeedback.userId, userId),
        eq(sourceFeedback.sourceCredibilityId, sourceCredibilityId)
      )
    )
    .limit(1);

  return result || null;
}

export async function createSourceFeedback(
  data: CreateSourceFeedbackData
): Promise<SourceFeedback> {
  const [newRecord] = await database
    .insert(sourceFeedback)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return newRecord;
}

export async function updateSourceFeedback(
  id: string,
  data: UpdateSourceFeedbackData
): Promise<SourceFeedback | null> {
  const [updated] = await database
    .update(sourceFeedback)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(sourceFeedback.id, id))
    .returning();

  return updated || null;
}

export async function deleteSourceFeedback(id: string): Promise<boolean> {
  const result = await database
    .delete(sourceFeedback)
    .where(eq(sourceFeedback.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Create or update user feedback for a source.
 * Each user can only have one feedback per source.
 */
export async function upsertUserSourceFeedback(
  userId: string,
  sourceCredibilityId: string,
  rating: number,
  feedback?: string
): Promise<SourceFeedback> {
  const existing = await findUserSourceFeedback(userId, sourceCredibilityId);

  if (existing) {
    const updated = await updateSourceFeedback(existing.id, {
      rating,
      feedback,
    });
    return updated!;
  }

  return await createSourceFeedback({
    id: crypto.randomUUID(),
    userId,
    sourceCredibilityId,
    rating,
    feedback,
  });
}

export interface SourceFeedbackWithUser extends SourceFeedback {
  userName: string | null;
}

/**
 * Get all feedback for a source with user info.
 */
export async function getSourceFeedbackWithUsers(
  sourceCredibilityId: string,
  limit: number = 20,
  offset: number = 0
): Promise<SourceFeedbackWithUser[]> {
  const results = await database
    .select({
      feedback: sourceFeedback,
      userName: user.name,
    })
    .from(sourceFeedback)
    .innerJoin(user, eq(sourceFeedback.userId, user.id))
    .where(eq(sourceFeedback.sourceCredibilityId, sourceCredibilityId))
    .orderBy(desc(sourceFeedback.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r.feedback,
    userName: r.userName,
  }));
}

/**
 * Count total feedback for a source.
 */
export async function countSourceFeedback(
  sourceCredibilityId: string
): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)` })
    .from(sourceFeedback)
    .where(eq(sourceFeedback.sourceCredibilityId, sourceCredibilityId));

  return Number(result?.count || 0);
}

export interface FeedbackStats {
  averageRating: number | null;
  totalCount: number;
  ratingDistribution: { rating: number; count: number }[];
}

/**
 * Get feedback statistics for a source.
 */
export async function getSourceFeedbackStats(
  sourceCredibilityId: string
): Promise<FeedbackStats> {
  const [avgResult] = await database
    .select({
      avgRating: sql<number>`AVG(${sourceFeedback.rating})::real`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(sourceFeedback)
    .where(eq(sourceFeedback.sourceCredibilityId, sourceCredibilityId));

  const distribution = await database
    .select({
      rating: sourceFeedback.rating,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(sourceFeedback)
    .where(eq(sourceFeedback.sourceCredibilityId, sourceCredibilityId))
    .groupBy(sourceFeedback.rating)
    .orderBy(sourceFeedback.rating);

  return {
    averageRating: avgResult?.avgRating || null,
    totalCount: avgResult?.count || 0,
    ratingDistribution: distribution,
  };
}

/**
 * Get all feedback from a specific user.
 */
export async function getUserFeedback(
  userId: string,
  limit: number = 50
): Promise<SourceFeedback[]> {
  return await database
    .select()
    .from(sourceFeedback)
    .where(eq(sourceFeedback.userId, userId))
    .orderBy(desc(sourceFeedback.createdAt))
    .limit(limit);
}

/**
 * Get recent feedback across all sources.
 */
export async function getRecentFeedback(
  limit: number = 20
): Promise<SourceFeedbackWithUser[]> {
  const results = await database
    .select({
      feedback: sourceFeedback,
      userName: user.name,
    })
    .from(sourceFeedback)
    .innerJoin(user, eq(sourceFeedback.userId, user.id))
    .orderBy(desc(sourceFeedback.createdAt))
    .limit(limit);

  return results.map((r) => ({
    ...r.feedback,
    userName: r.userName,
  }));
}
