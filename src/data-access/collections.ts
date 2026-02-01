import { eq, desc, sql, and } from "drizzle-orm";
import { database } from "~/db";
import {
  collection,
  collectionTopic,
  topic,
  type Collection,
  type CreateCollectionData,
  type UpdateCollectionData,
  type CollectionTopic,
  type Topic,
} from "~/db/schema";

export type CollectionWithTopicCount = Collection & {
  topicCount: number;
};

export type CollectionWithTopics = Collection & {
  topics: (Topic & { position: number })[];
  topicCount: number;
};

export async function findCollectionById(id: string): Promise<Collection | null> {
  const [result] = await database
    .select()
    .from(collection)
    .where(eq(collection.id, id))
    .limit(1);

  return result || null;
}

export async function createCollection(collectionData: CreateCollectionData): Promise<Collection> {
  const [newCollection] = await database
    .insert(collection)
    .values({
      ...collectionData,
      updatedAt: new Date(),
    })
    .returning();

  return newCollection;
}

export async function updateCollection(id: string, collectionData: UpdateCollectionData): Promise<Collection | null> {
  const [updatedCollection] = await database
    .update(collection)
    .set({
      ...collectionData,
      updatedAt: new Date(),
    })
    .where(eq(collection.id, id))
    .returning();

  return updatedCollection || null;
}

export async function deleteCollection(id: string): Promise<boolean> {
  const result = await database
    .delete(collection)
    .where(eq(collection.id, id))
    .returning();

  return result.length > 0;
}

export async function findCollectionsByUserId(userId: string): Promise<CollectionWithTopicCount[]> {
  const collections = await database
    .select()
    .from(collection)
    .where(eq(collection.userId, userId))
    .orderBy(desc(collection.createdAt));

  // Get topic counts for each collection
  const collectionsWithCounts = await Promise.all(
    collections.map(async (c) => {
      const [topicCountResult] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(collectionTopic)
        .where(eq(collectionTopic.collectionId, c.id));

      return {
        ...c,
        topicCount: topicCountResult?.count || 0,
      };
    })
  );

  return collectionsWithCounts;
}

export async function countCollectionsByUserId(userId: string): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(collection)
    .where(eq(collection.userId, userId));

  return result?.count || 0;
}

export async function findCollectionByIdWithTopics(id: string): Promise<CollectionWithTopics | null> {
  const collectionData = await findCollectionById(id);
  if (!collectionData) return null;

  const collectionTopics = await database
    .select({
      topic,
      position: collectionTopic.position,
    })
    .from(collectionTopic)
    .innerJoin(topic, eq(collectionTopic.topicId, topic.id))
    .where(eq(collectionTopic.collectionId, id))
    .orderBy(collectionTopic.position);

  return {
    ...collectionData,
    topics: collectionTopics.map((ct) => ({ ...ct.topic, position: ct.position })),
    topicCount: collectionTopics.length,
  };
}

export async function addTopicToCollection(collectionId: string, topicId: string): Promise<CollectionTopic> {
  const [maxPositionResult] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionTopic)
    .where(eq(collectionTopic.collectionId, collectionId));

  const position = (maxPositionResult?.count || 0) + 1;

  const [newCollectionTopic] = await database
    .insert(collectionTopic)
    .values({
      id: crypto.randomUUID(),
      collectionId,
      topicId,
      position,
    })
    .returning();

  return newCollectionTopic;
}

export async function removeTopicFromCollection(collectionId: string, topicId: string): Promise<boolean> {
  const result = await database
    .delete(collectionTopic)
    .where(and(
      eq(collectionTopic.collectionId, collectionId),
      eq(collectionTopic.topicId, topicId)
    ))
    .returning();

  return result.length > 0;
}

export async function checkCollectionOwnership(collectionId: string, userId: string): Promise<boolean> {
  const [result] = await database
    .select({ id: collection.id })
    .from(collection)
    .where(and(
      eq(collection.id, collectionId),
      eq(collection.userId, userId)
    ))
    .limit(1);

  return !!result;
}

export async function isTopicInCollection(collectionId: string, topicId: string): Promise<boolean> {
  const [result] = await database
    .select({ id: collectionTopic.id })
    .from(collectionTopic)
    .where(and(
      eq(collectionTopic.collectionId, collectionId),
      eq(collectionTopic.topicId, topicId)
    ))
    .limit(1);

  return !!result;
}

// RSS Feed token functions
export async function findCollectionByFeedToken(feedToken: string): Promise<Collection | null> {
  const [result] = await database
    .select()
    .from(collection)
    .where(eq(collection.feedToken, feedToken))
    .limit(1);

  return result || null;
}

export async function updateCollectionFeedToken(
  id: string,
  feedToken: string | null
): Promise<Collection | null> {
  const [updatedCollection] = await database
    .update(collection)
    .set({
      feedToken,
      updatedAt: new Date(),
    })
    .where(eq(collection.id, id))
    .returning();

  return updatedCollection || null;
}
