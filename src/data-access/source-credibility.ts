import { eq, desc, asc, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  sourceCredibility,
  sourceFeedback,
  article,
  type SourceCredibility,
  type CreateSourceCredibilityData,
  type UpdateSourceCredibilityData,
} from "~/db/schema";

export async function findSourceCredibilityById(
  id: string
): Promise<SourceCredibility | null> {
  const [result] = await database
    .select()
    .from(sourceCredibility)
    .where(eq(sourceCredibility.id, id))
    .limit(1);

  return result || null;
}

export async function findSourceCredibilityByName(
  sourceName: string
): Promise<SourceCredibility | null> {
  const [result] = await database
    .select()
    .from(sourceCredibility)
    .where(eq(sourceCredibility.sourceName, sourceName))
    .limit(1);

  return result || null;
}

export async function createSourceCredibility(
  data: CreateSourceCredibilityData
): Promise<SourceCredibility> {
  const [newRecord] = await database
    .insert(sourceCredibility)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return newRecord;
}

export async function updateSourceCredibility(
  id: string,
  data: UpdateSourceCredibilityData
): Promise<SourceCredibility | null> {
  const [updated] = await database
    .update(sourceCredibility)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(sourceCredibility.id, id))
    .returning();

  return updated || null;
}

export async function deleteSourceCredibility(id: string): Promise<boolean> {
  const result = await database
    .delete(sourceCredibility)
    .where(eq(sourceCredibility.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Get or create a source credibility record for a given source name.
 * This ensures we have a record for every source we encounter.
 */
export async function getOrCreateSourceCredibility(
  sourceName: string
): Promise<SourceCredibility> {
  const existing = await findSourceCredibilityByName(sourceName);
  if (existing) {
    return existing;
  }

  return await createSourceCredibility({
    id: crypto.randomUUID(),
    sourceName,
    userFeedbackCount: 0,
    articleCount: 0,
  });
}

/**
 * Get all source credibility records ordered by score.
 */
export async function getAllSourceCredibilities(
  limit: number = 100,
  offset: number = 0
): Promise<SourceCredibility[]> {
  return await database
    .select()
    .from(sourceCredibility)
    .orderBy(desc(sourceCredibility.credibilityScore))
    .limit(limit)
    .offset(offset);
}

/**
 * Get top rated sources.
 */
export async function getTopRatedSources(
  limit: number = 10
): Promise<SourceCredibility[]> {
  return await database
    .select()
    .from(sourceCredibility)
    .where(sql`${sourceCredibility.credibilityScore} IS NOT NULL`)
    .orderBy(desc(sourceCredibility.credibilityScore))
    .limit(limit);
}

/**
 * Get lowest rated sources.
 */
export async function getLowestRatedSources(
  limit: number = 10
): Promise<SourceCredibility[]> {
  return await database
    .select()
    .from(sourceCredibility)
    .where(sql`${sourceCredibility.credibilityScore} IS NOT NULL`)
    .orderBy(asc(sourceCredibility.credibilityScore))
    .limit(limit);
}

/**
 * Update the article count for a source.
 */
export async function incrementArticleCount(
  sourceName: string
): Promise<void> {
  const source = await getOrCreateSourceCredibility(sourceName);

  await database
    .update(sourceCredibility)
    .set({
      articleCount: (source.articleCount || 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(sourceCredibility.id, source.id));
}

/**
 * Recalculate and update the credibility score for a source.
 * Score is based on:
 * - User feedback (40%)
 * - Article accuracy/fact-check correlation (40%)
 * - Transparency rating (20%)
 */
export async function recalculateCredibilityScore(
  sourceId: string
): Promise<SourceCredibility | null> {
  const source = await findSourceCredibilityById(sourceId);
  if (!source) return null;

  // Calculate the weighted score
  let score = 0;
  let weightSum = 0;

  // User feedback contributes 40%
  if (source.userFeedbackScore !== null && source.userFeedbackCount > 0) {
    // Convert 1-5 scale to 0-100
    const feedbackScore = ((source.userFeedbackScore - 1) / 4) * 100;
    score += feedbackScore * 0.4;
    weightSum += 0.4;
  }

  // Accuracy rating contributes 40%
  if (source.accuracyRating !== null) {
    score += source.accuracyRating * 100 * 0.4;
    weightSum += 0.4;
  }

  // Transparency rating contributes 20%
  if (source.transparencyRating !== null) {
    score += source.transparencyRating * 100 * 0.2;
    weightSum += 0.2;
  }

  // Normalize the score if we don't have all components
  const finalScore = weightSum > 0 ? Math.round(score / weightSum) : null;

  return await updateSourceCredibility(sourceId, {
    credibilityScore: finalScore,
    lastCalculatedAt: new Date(),
  });
}

/**
 * Update user feedback score for a source based on all feedback.
 */
export async function updateUserFeedbackScore(
  sourceId: string
): Promise<SourceCredibility | null> {
  const [result] = await database
    .select({
      avgRating: sql<number>`AVG(${sourceFeedback.rating})::real`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(sourceFeedback)
    .where(eq(sourceFeedback.sourceCredibilityId, sourceId));

  if (!result || result.count === 0) {
    return await updateSourceCredibility(sourceId, {
      userFeedbackScore: null,
      userFeedbackCount: 0,
    });
  }

  return await updateSourceCredibility(sourceId, {
    userFeedbackScore: result.avgRating,
    userFeedbackCount: result.count,
  });
}

/**
 * Get sources that need credibility recalculation.
 * These are sources with feedback but no recent calculation.
 */
export async function getSourcesNeedingRecalculation(
  hoursOld: number = 24
): Promise<SourceCredibility[]> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursOld);

  return await database
    .select()
    .from(sourceCredibility)
    .where(
      sql`${sourceCredibility.lastCalculatedAt} IS NULL OR ${sourceCredibility.lastCalculatedAt} < ${cutoff}`
    )
    .limit(100);
}

/**
 * Count total sources with credibility scores.
 */
export async function countSourcesWithScores(): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)` })
    .from(sourceCredibility)
    .where(sql`${sourceCredibility.credibilityScore} IS NOT NULL`);

  return Number(result?.count || 0);
}

/**
 * Get credibility stats summary.
 */
export interface CredibilityStats {
  totalSources: number;
  sourcesWithScores: number;
  averageScore: number | null;
  sourcesAbove80: number;
  sourcesBelow40: number;
}

export async function getCredibilityStats(): Promise<CredibilityStats> {
  const [stats] = await database
    .select({
      totalSources: sql<number>`COUNT(*)::int`,
      sourcesWithScores: sql<number>`COUNT(${sourceCredibility.credibilityScore})::int`,
      averageScore: sql<number>`AVG(${sourceCredibility.credibilityScore})::real`,
      sourcesAbove80: sql<number>`COUNT(*) FILTER (WHERE ${sourceCredibility.credibilityScore} >= 80)::int`,
      sourcesBelow40: sql<number>`COUNT(*) FILTER (WHERE ${sourceCredibility.credibilityScore} < 40)::int`,
    })
    .from(sourceCredibility);

  return {
    totalSources: stats?.totalSources || 0,
    sourcesWithScores: stats?.sourcesWithScores || 0,
    averageScore: stats?.averageScore || null,
    sourcesAbove80: stats?.sourcesAbove80 || 0,
    sourcesBelow40: stats?.sourcesBelow40 || 0,
  };
}
