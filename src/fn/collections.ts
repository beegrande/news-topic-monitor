import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  findCollectionById,
  findCollectionsByUserId,
  findCollectionByIdWithTopics,
  createCollection,
  updateCollection,
  deleteCollection,
  addTopicToCollection,
  removeTopicFromCollection,
  checkCollectionOwnership,
  isTopicInCollection,
  updateCollectionFeedToken,
} from "~/data-access/collections";

export const getCollectionsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await findCollectionsByUserId(context.userId);
  });

export const getCollectionByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const col = await findCollectionByIdWithTopics(data.id);
    if (!col) {
      throw new Error("Collection not found");
    }
    if (col.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own collections");
    }
    return col;
  });

export const createCollectionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      color: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const collectionData = {
      id: crypto.randomUUID(),
      ...data,
      userId: context.userId,
    };

    const newCollection = await createCollection(collectionData);
    return newCollection;
  });

export const updateCollectionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      color: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;

    const isOwner = await checkCollectionOwnership(id, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only edit your own collections");
    }

    const updatedCollection = await updateCollection(id, updateData);
    if (!updatedCollection) {
      throw new Error("Failed to update collection");
    }

    return updatedCollection;
  });

export const deleteCollectionFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    const isOwner = await checkCollectionOwnership(id, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only delete your own collections");
    }

    const deleted = await deleteCollection(id);
    if (!deleted) {
      throw new Error("Failed to delete collection");
    }

    return { success: true };
  });

export const addTopicToCollectionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      collectionId: z.string(),
      topicId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { collectionId, topicId } = data;

    const isOwner = await checkCollectionOwnership(collectionId, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only modify your own collections");
    }

    // Check if topic is already in collection
    const alreadyExists = await isTopicInCollection(collectionId, topicId);
    if (alreadyExists) {
      throw new Error("Topic is already in this collection");
    }

    const collectionTopic = await addTopicToCollection(collectionId, topicId);
    return collectionTopic;
  });

export const removeTopicFromCollectionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      collectionId: z.string(),
      topicId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { collectionId, topicId } = data;

    const isOwner = await checkCollectionOwnership(collectionId, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only modify your own collections");
    }

    const removed = await removeTopicFromCollection(collectionId, topicId);
    if (!removed) {
      throw new Error("Failed to remove topic from collection");
    }

    return { success: true };
  });

// RSS Feed token functions
export const generateCollectionFeedTokenFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    const isOwner = await checkCollectionOwnership(id, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only manage feed tokens for your own collections");
    }

    const feedToken = crypto.randomUUID();
    const updatedCollection = await updateCollectionFeedToken(id, feedToken);

    if (!updatedCollection) {
      throw new Error("Failed to generate feed token");
    }

    return updatedCollection;
  });

export const revokeCollectionFeedTokenFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    const isOwner = await checkCollectionOwnership(id, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only manage feed tokens for your own collections");
    }

    const updatedCollection = await updateCollectionFeedToken(id, null);

    if (!updatedCollection) {
      throw new Error("Failed to revoke feed token");
    }

    return updatedCollection;
  });
