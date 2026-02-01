import { eq, desc, sql, and, lt, or, isNull } from "drizzle-orm";
import { database } from "~/db";
import {
  topic,
  articleTopic,
  user,
  topicCollaborator,
  type Topic,
  type CreateTopicData,
  type UpdateTopicData,
  type SubscriptionPlan,
  type TopicCollaborator,
  type CreateTopicCollaboratorData,
} from "~/db/schema";

export type TopicWithArticleCount = Topic & {
  articleCount: number;
};

export type TopicWithUserPlan = Topic & {
  userPlan: SubscriptionPlan;
};

export async function findTopicById(id: string): Promise<Topic | null> {
  const [result] = await database
    .select()
    .from(topic)
    .where(eq(topic.id, id))
    .limit(1);

  return result || null;
}

export async function findTopicsByUserId(userId: string): Promise<Topic[]> {
  return await database
    .select()
    .from(topic)
    .where(eq(topic.userId, userId))
    .orderBy(desc(topic.createdAt));
}

export async function createTopic(topicData: CreateTopicData): Promise<Topic> {
  const [newTopic] = await database
    .insert(topic)
    .values({
      ...topicData,
      updatedAt: new Date(),
    })
    .returning();

  return newTopic;
}

export async function updateTopic(
  id: string,
  topicData: UpdateTopicData
): Promise<Topic | null> {
  const [updatedTopic] = await database
    .update(topic)
    .set({
      ...topicData,
      updatedAt: new Date(),
    })
    .where(eq(topic.id, id))
    .returning();

  return updatedTopic || null;
}

export async function deleteTopic(id: string): Promise<boolean> {
  const result = await database
    .delete(topic)
    .where(eq(topic.id, id))
    .returning();

  return result.length > 0;
}

export async function countTopicsByUserId(userId: string): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(topic)
    .where(eq(topic.userId, userId));

  return result?.count ?? 0;
}

export async function findActiveTopics(): Promise<Topic[]> {
  return await database
    .select()
    .from(topic)
    .where(eq(topic.status, "active"))
    .orderBy(desc(topic.createdAt));
}

export async function findTopicsByUserIdWithArticleCount(
  userId: string
): Promise<TopicWithArticleCount[]> {
  const topics = await findTopicsByUserId(userId);

  const topicsWithCounts = await Promise.all(
    topics.map(async (t) => {
      const [result] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(articleTopic)
        .where(eq(articleTopic.topicId, t.id));

      return {
        ...t,
        articleCount: result?.count ?? 0,
      };
    })
  );

  return topicsWithCounts;
}

export async function setTopicStatus(
  id: string,
  status: string
): Promise<Topic | null> {
  const [updatedTopic] = await database
    .update(topic)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(topic.id, id))
    .returning();

  return updatedTopic || null;
}

export async function checkTopicOwnership(
  topicId: string,
  userId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: topic.id })
    .from(topic)
    .where(and(eq(topic.id, topicId), eq(topic.userId, userId)))
    .limit(1);

  return !!result;
}

export async function updateTopicLastChecked(id: string): Promise<Topic | null> {
  const [updatedTopic] = await database
    .update(topic)
    .set({
      lastCheckedAt: new Date(),
      lastError: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    })
    .where(eq(topic.id, id))
    .returning();

  return updatedTopic || null;
}

export async function updateTopicError(
  id: string,
  error: string
): Promise<Topic | null> {
  const [updatedTopic] = await database
    .update(topic)
    .set({
      lastError: error,
      lastErrorAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(topic.id, id))
    .returning();

  return updatedTopic || null;
}

export async function clearTopicError(id: string): Promise<Topic | null> {
  const [updatedTopic] = await database
    .update(topic)
    .set({
      lastError: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    })
    .where(eq(topic.id, id))
    .returning();

  return updatedTopic || null;
}

export async function findActiveTopicsDueForCheck(
  maxIntervalHours: number
): Promise<TopicWithUserPlan[]> {
  const cutoffTime = new Date(Date.now() - maxIntervalHours * 60 * 60 * 1000);

  const results = await database
    .select({
      id: topic.id,
      name: topic.name,
      description: topic.description,
      keywords: topic.keywords,
      monitoringFrequency: topic.monitoringFrequency,
      status: topic.status,
      lastCheckedAt: topic.lastCheckedAt,
      lastError: topic.lastError,
      lastErrorAt: topic.lastErrorAt,
      includedSources: topic.includedSources,
      excludedSources: topic.excludedSources,
      languages: topic.languages,
      notificationEnabled: topic.notificationEnabled,
      notificationFrequency: topic.notificationFrequency,
      minimumRelevanceScore: topic.minimumRelevanceScore,
      isPublic: topic.isPublic,
      shareToken: topic.shareToken,
      feedToken: topic.feedToken,
      parentId: topic.parentId,
      position: topic.position,
      scheduleEnabled: topic.scheduleEnabled,
      scheduleDays: topic.scheduleDays,
      scheduleStartHour: topic.scheduleStartHour,
      scheduleEndHour: topic.scheduleEndHour,
      scheduleTimezone: topic.scheduleTimezone,
      userId: topic.userId,
      teamId: topic.teamId,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
      userPlan: user.plan,
    })
    .from(topic)
    .innerJoin(user, eq(topic.userId, user.id))
    .where(
      and(
        eq(topic.status, "active"),
        or(isNull(topic.lastCheckedAt), lt(topic.lastCheckedAt, cutoffTime))
      )
    );

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    keywords: row.keywords,
    monitoringFrequency: row.monitoringFrequency,
    status: row.status,
    lastCheckedAt: row.lastCheckedAt,
    lastError: row.lastError,
    lastErrorAt: row.lastErrorAt,
    includedSources: row.includedSources,
    excludedSources: row.excludedSources,
    languages: row.languages,
    notificationEnabled: row.notificationEnabled,
    notificationFrequency: row.notificationFrequency,
    minimumRelevanceScore: row.minimumRelevanceScore,
    isPublic: row.isPublic,
    shareToken: row.shareToken,
    feedToken: row.feedToken,
    parentId: row.parentId,
    position: row.position,
    scheduleEnabled: row.scheduleEnabled,
    scheduleDays: row.scheduleDays,
    scheduleStartHour: row.scheduleStartHour,
    scheduleEndHour: row.scheduleEndHour,
    scheduleTimezone: row.scheduleTimezone,
    userId: row.userId,
    teamId: row.teamId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userPlan: (row.userPlan || "free") as SubscriptionPlan,
  }));
}

// Topic sharing functions
export async function findTopicByShareToken(shareToken: string): Promise<Topic | null> {
  const [result] = await database
    .select()
    .from(topic)
    .where(eq(topic.shareToken, shareToken))
    .limit(1);

  return result || null;
}

export async function findPublicTopics(): Promise<TopicWithArticleCount[]> {
  const topics = await database
    .select()
    .from(topic)
    .where(eq(topic.isPublic, true))
    .orderBy(desc(topic.createdAt));

  const topicsWithCounts = await Promise.all(
    topics.map(async (t) => {
      const [result] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(articleTopic)
        .where(eq(articleTopic.topicId, t.id));

      return {
        ...t,
        articleCount: result?.count ?? 0,
      };
    })
  );

  return topicsWithCounts;
}

export async function updateTopicShareSettings(
  id: string,
  isPublic: boolean,
  shareToken: string | null
): Promise<Topic | null> {
  const [updatedTopic] = await database
    .update(topic)
    .set({
      isPublic,
      shareToken,
      updatedAt: new Date(),
    })
    .where(eq(topic.id, id))
    .returning();

  return updatedTopic || null;
}

export async function addTopicCollaborator(
  data: CreateTopicCollaboratorData
): Promise<TopicCollaborator> {
  const [newCollaborator] = await database
    .insert(topicCollaborator)
    .values(data)
    .returning();

  return newCollaborator;
}

export async function removeTopicCollaborator(
  topicId: string,
  userId: string
): Promise<boolean> {
  const result = await database
    .delete(topicCollaborator)
    .where(
      and(
        eq(topicCollaborator.topicId, topicId),
        eq(topicCollaborator.userId, userId)
      )
    )
    .returning();

  return result.length > 0;
}

export type CollaboratorWithUser = TopicCollaborator & {
  userName: string;
  userEmail: string;
};

export async function findTopicCollaborators(
  topicId: string
): Promise<CollaboratorWithUser[]> {
  const results = await database
    .select({
      id: topicCollaborator.id,
      topicId: topicCollaborator.topicId,
      userId: topicCollaborator.userId,
      permission: topicCollaborator.permission,
      addedAt: topicCollaborator.addedAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(topicCollaborator)
    .innerJoin(user, eq(topicCollaborator.userId, user.id))
    .where(eq(topicCollaborator.topicId, topicId));

  return results;
}

export async function isTopicCollaborator(
  topicId: string,
  userId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: topicCollaborator.id })
    .from(topicCollaborator)
    .where(
      and(
        eq(topicCollaborator.topicId, topicId),
        eq(topicCollaborator.userId, userId)
      )
    )
    .limit(1);

  return !!result;
}

export async function canAccessTopic(
  topicId: string,
  userId: string
): Promise<boolean> {
  // Check if owner
  const ownerResult = await checkTopicOwnership(topicId, userId);
  if (ownerResult) return true;

  // Check if collaborator
  const collaboratorResult = await isTopicCollaborator(topicId, userId);
  if (collaboratorResult) return true;

  // Check if public
  const topicResult = await findTopicById(topicId);
  if (topicResult?.isPublic) return true;

  return false;
}

// RSS Feed token functions
export async function findTopicByFeedToken(feedToken: string): Promise<Topic | null> {
  const [result] = await database
    .select()
    .from(topic)
    .where(eq(topic.feedToken, feedToken))
    .limit(1);

  return result || null;
}

export async function updateTopicFeedToken(
  id: string,
  feedToken: string | null
): Promise<Topic | null> {
  const [updatedTopic] = await database
    .update(topic)
    .set({
      feedToken,
      updatedAt: new Date(),
    })
    .where(eq(topic.id, id))
    .returning();

  return updatedTopic || null;
}

// Topic hierarchy functions
export type TopicWithChildren = Topic & {
  children: TopicWithChildren[];
};

export type TopicWithParent = Topic & {
  parent: Topic | null;
};

export type TopicWithHierarchy = Topic & {
  parent: Topic | null;
  children: Topic[];
  depth: number;
};

export async function findRootTopicsByUserId(userId: string): Promise<Topic[]> {
  return await database
    .select()
    .from(topic)
    .where(and(eq(topic.userId, userId), isNull(topic.parentId)))
    .orderBy(topic.position, desc(topic.createdAt));
}

export async function findChildTopics(parentId: string): Promise<Topic[]> {
  return await database
    .select()
    .from(topic)
    .where(eq(topic.parentId, parentId))
    .orderBy(topic.position, desc(topic.createdAt));
}

export async function findTopicWithParent(id: string): Promise<TopicWithParent | null> {
  const topicResult = await findTopicById(id);
  if (!topicResult) return null;

  let parent: Topic | null = null;
  if (topicResult.parentId) {
    parent = await findTopicById(topicResult.parentId);
  }

  return {
    ...topicResult,
    parent,
  };
}

export async function getTopicAncestors(id: string): Promise<Topic[]> {
  const ancestors: Topic[] = [];
  let currentTopic = await findTopicById(id);

  while (currentTopic?.parentId) {
    const parent = await findTopicById(currentTopic.parentId);
    if (parent) {
      ancestors.unshift(parent); // Add to beginning for correct order
      currentTopic = parent;
    } else {
      break;
    }
  }

  return ancestors;
}

export async function getTopicDepth(id: string): Promise<number> {
  const ancestors = await getTopicAncestors(id);
  return ancestors.length;
}

export async function buildTopicHierarchy(userId: string): Promise<TopicWithChildren[]> {
  // Get all topics for the user
  const allTopics = await findTopicsByUserId(userId);

  // Create a map for quick lookup
  const topicMap = new Map<string, TopicWithChildren>();
  allTopics.forEach(t => {
    topicMap.set(t.id, { ...t, children: [] });
  });

  // Build the tree
  const roots: TopicWithChildren[] = [];
  allTopics.forEach(t => {
    const topicWithChildren = topicMap.get(t.id)!;
    if (t.parentId && topicMap.has(t.parentId)) {
      topicMap.get(t.parentId)!.children.push(topicWithChildren);
    } else {
      roots.push(topicWithChildren);
    }
  });

  // Sort children by position
  const sortChildren = (topics: TopicWithChildren[]) => {
    topics.sort((a, b) => a.position - b.position);
    topics.forEach(t => sortChildren(t.children));
  };
  sortChildren(roots);

  return roots;
}

export async function updateTopicParent(
  id: string,
  parentId: string | null,
  position?: number
): Promise<Topic | null> {
  const updateData: { parentId: string | null; position?: number; updatedAt: Date } = {
    parentId,
    updatedAt: new Date(),
  };

  if (position !== undefined) {
    updateData.position = position;
  }

  const [updatedTopic] = await database
    .update(topic)
    .set(updateData)
    .where(eq(topic.id, id))
    .returning();

  return updatedTopic || null;
}

export async function getNextSiblingPosition(parentId: string | null, userId: string): Promise<number> {
  const siblings = parentId
    ? await findChildTopics(parentId)
    : await findRootTopicsByUserId(userId);

  if (siblings.length === 0) return 0;

  const maxPosition = Math.max(...siblings.map(s => s.position));
  return maxPosition + 1;
}

export async function canSetAsParent(topicId: string, potentialParentId: string): Promise<boolean> {
  // Cannot set self as parent
  if (topicId === potentialParentId) return false;

  // Check if potentialParentId is a descendant of topicId (would create a cycle)
  const ancestors = await getTopicAncestors(potentialParentId);
  return !ancestors.some(a => a.id === topicId);
}

// Trending topics functions
export interface TrendingTopic {
  keywords: string;
  topicCount: number;
  articleCount: number;
  recentArticleCount: number;
  sampleTopicName: string;
}

/**
 * Get trending topics across all users based on keyword popularity.
 * Aggregates topics by their keywords and ranks by article activity.
 */
export async function getTrendingTopics(limit: number = 10): Promise<TrendingTopic[]> {
  // Get all active public topics with their article counts
  const results = await database
    .select({
      keywords: topic.keywords,
      topicName: topic.name,
      topicCount: sql<number>`count(DISTINCT ${topic.id})::int`,
      articleCount: sql<number>`count(DISTINCT ${articleTopic.articleId})::int`,
    })
    .from(topic)
    .leftJoin(articleTopic, eq(topic.id, articleTopic.topicId))
    .where(eq(topic.status, "active"))
    .groupBy(topic.keywords, topic.name)
    .orderBy(sql`count(DISTINCT ${articleTopic.articleId}) DESC`)
    .limit(limit * 3); // Get more than needed to filter and dedupe

  // Aggregate by normalized keywords (case-insensitive)
  const keywordMap = new Map<string, {
    keywords: string;
    topicCount: number;
    articleCount: number;
    sampleTopicName: string;
  }>();

  for (const row of results) {
    // Normalize keywords for grouping (lowercase, sorted)
    const normalizedKey = row.keywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0)
      .sort()
      .join(",");

    if (normalizedKey.length === 0) continue;

    const existing = keywordMap.get(normalizedKey);
    if (existing) {
      existing.topicCount += row.topicCount;
      existing.articleCount += row.articleCount;
    } else {
      keywordMap.set(normalizedKey, {
        keywords: row.keywords, // Keep original formatting for display
        topicCount: row.topicCount,
        articleCount: row.articleCount,
        sampleTopicName: row.topicName,
      });
    }
  }

  // Convert to array and sort by article count
  const trending = Array.from(keywordMap.values())
    .sort((a, b) => b.articleCount - a.articleCount)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      recentArticleCount: item.articleCount, // For now, same as total
    }));

  return trending;
}
