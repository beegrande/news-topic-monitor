import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware, optionalAuthMiddleware } from "./middleware";
import {
  findTopicById,
  findTopicsByUserIdWithArticleCount,
  createTopic,
  updateTopic,
  deleteTopic,
  setTopicStatus,
  countTopicsByUserId,
  updateTopicShareSettings,
  findTopicByShareToken,
  findPublicTopics,
  addTopicCollaborator,
  removeTopicCollaborator,
  findTopicCollaborators,
  canAccessTopic,
  updateTopicFeedToken,
  buildTopicHierarchy,
  updateTopicParent,
  getNextSiblingPosition,
  canSetAsParent,
  getTopicAncestors,
  findTopicsByUserId,
  getTrendingTopics,
} from "~/data-access/topics";

export const getUserTopicsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await findTopicsByUserIdWithArticleCount(context.userId);
  });

export const getTopicByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const topic = await findTopicById(data.id);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }
    return topic;
  });

export const createTopicFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      name: z.string().min(2).max(100),
      description: z.string().max(500).optional(),
      keywords: z.string().min(1, "At least one keyword is required"),
      includedSources: z.string().optional(),
      excludedSources: z.string().optional(),
      parentId: z.string().nullable().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // If parentId is provided, verify it exists and belongs to the user
    if (data.parentId) {
      const parentTopic = await findTopicById(data.parentId);
      if (!parentTopic) {
        throw new Error("Parent topic not found");
      }
      if (parentTopic.userId !== context.userId) {
        throw new Error("Unauthorized: Parent topic must belong to you");
      }
    }

    // Get next position for ordering
    const position = await getNextSiblingPosition(data.parentId || null, context.userId);

    const topicData = {
      id: crypto.randomUUID(),
      ...data,
      includedSources: data.includedSources || null,
      excludedSources: data.excludedSources || null,
      parentId: data.parentId || null,
      position,
      userId: context.userId,
    };

    const newTopic = await createTopic(topicData);
    return newTopic;
  });

export const updateTopicFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional(),
      keywords: z.string().min(1).optional(),
      monitoringFrequency: z.enum(["hourly", "daily", "weekly"]).optional(),
      status: z.enum(["active", "paused", "archived"]).optional(),
      includedSources: z.string().nullable().optional(),
      excludedSources: z.string().nullable().optional(),
      notificationEnabled: z.boolean().optional(),
      notificationFrequency: z.enum(["daily", "weekly", "none"]).optional(),
      minimumRelevanceScore: z.number().min(0).max(1).optional(),
      parentId: z.string().nullable().optional(),
      // Schedule settings
      scheduleEnabled: z.boolean().optional(),
      scheduleDays: z.string().nullable().optional(), // Comma-separated days (0-6)
      scheduleStartHour: z.number().min(0).max(23).nullable().optional(),
      scheduleEndHour: z.number().min(0).max(23).nullable().optional(),
      scheduleTimezone: z.string().nullable().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, parentId, ...updateData } = data;

    const existingTopic = await findTopicById(id);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only edit your own topics");
    }

    // Handle parent change separately if provided
    if (parentId !== undefined) {
      if (parentId !== null) {
        // Verify parent exists and belongs to the user
        const parentTopic = await findTopicById(parentId);
        if (!parentTopic) {
          throw new Error("Parent topic not found");
        }
        if (parentTopic.userId !== context.userId) {
          throw new Error("Unauthorized: Parent topic must belong to you");
        }
        // Check for cycles
        const canBeParent = await canSetAsParent(id, parentId);
        if (!canBeParent) {
          throw new Error("Cannot set this topic as parent: would create a cycle");
        }
      }

      // Get position if parent is changing
      const newPosition = existingTopic.parentId !== parentId
        ? await getNextSiblingPosition(parentId, context.userId)
        : existingTopic.position;

      (updateData as any).parentId = parentId;
      (updateData as any).position = newPosition;
    }

    const updatedTopic = await updateTopic(id, updateData);
    if (!updatedTopic) {
      throw new Error("Failed to update topic");
    }

    return updatedTopic;
  });

export const deleteTopicFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    const existingTopic = await findTopicById(id);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only delete your own topics");
    }

    const deleted = await deleteTopic(id);
    if (!deleted) {
      throw new Error("Failed to delete topic");
    }

    return { success: true };
  });

export const setTopicStatusFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      status: z.enum(["active", "paused", "archived"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, status } = data;

    const existingTopic = await findTopicById(id);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only modify your own topics");
    }

    const updatedTopic = await setTopicStatus(id, status);
    if (!updatedTopic) {
      throw new Error("Failed to update topic status");
    }

    return updatedTopic;
  });

export const getTopicsCountFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await countTopicsByUserId(context.userId);
  });

// Topic sharing functions
export const toggleTopicPublicFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string(), isPublic: z.boolean() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, isPublic } = data;

    const existingTopic = await findTopicById(id);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only modify your own topics");
    }

    const updatedTopic = await updateTopicShareSettings(
      id,
      isPublic,
      existingTopic.shareToken
    );
    if (!updatedTopic) {
      throw new Error("Failed to update topic visibility");
    }

    return updatedTopic;
  });

export const generateShareLinkFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    const existingTopic = await findTopicById(id);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only modify your own topics");
    }

    const shareToken = crypto.randomUUID();
    const updatedTopic = await updateTopicShareSettings(
      id,
      existingTopic.isPublic,
      shareToken
    );

    if (!updatedTopic) {
      throw new Error("Failed to generate share link");
    }

    return updatedTopic;
  });

export const revokeShareLinkFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    const existingTopic = await findTopicById(id);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only modify your own topics");
    }

    const updatedTopic = await updateTopicShareSettings(
      id,
      existingTopic.isPublic,
      null
    );

    if (!updatedTopic) {
      throw new Error("Failed to revoke share link");
    }

    return updatedTopic;
  });

export const getSharedTopicFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const topic = await findTopicByShareToken(data.token);
    if (!topic) {
      throw new Error("Shared topic not found or link has expired");
    }
    return topic;
  });

export const getPublicTopicsFn = createServerFn({
  method: "GET",
}).handler(async () => {
  return await findPublicTopics();
});

export const addCollaboratorFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      topicId: z.string(),
      userId: z.string(),
      permission: z.enum(["view", "edit"]).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId, userId, permission = "view" } = data;

    const existingTopic = await findTopicById(topicId);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only manage collaborators on your own topics");
    }

    if (userId === context.userId) {
      throw new Error("You cannot add yourself as a collaborator");
    }

    const collaborator = await addTopicCollaborator({
      id: crypto.randomUUID(),
      topicId,
      userId,
      permission,
    });

    return collaborator;
  });

export const removeCollaboratorFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ topicId: z.string(), userId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId, userId } = data;

    const existingTopic = await findTopicById(topicId);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only manage collaborators on your own topics");
    }

    const removed = await removeTopicCollaborator(topicId, userId);
    if (!removed) {
      throw new Error("Collaborator not found");
    }

    return { success: true };
  });

export const getTopicCollaboratorsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ topicId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId } = data;

    const existingTopic = await findTopicById(topicId);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view collaborators on your own topics");
    }

    return await findTopicCollaborators(topicId);
  });

export const getAccessibleTopicFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([optionalAuthMiddleware])
  .handler(async ({ data, context }) => {
    const topic = await findTopicById(data.id);
    if (!topic) {
      throw new Error("Topic not found");
    }

    // If public, anyone can access
    if (topic.isPublic) {
      return topic;
    }

    // If not public, user must be authenticated
    if (!context.userId) {
      throw new Error("Unauthorized: This topic is not public");
    }

    // Check if user can access (owner or collaborator)
    const hasAccess = await canAccessTopic(data.id, context.userId);
    if (!hasAccess) {
      throw new Error("Unauthorized: You don't have access to this topic");
    }

    return topic;
  });

// RSS Feed token functions
export const generateTopicFeedTokenFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    const existingTopic = await findTopicById(id);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only manage feed tokens for your own topics");
    }

    const feedToken = crypto.randomUUID();
    const updatedTopic = await updateTopicFeedToken(id, feedToken);

    if (!updatedTopic) {
      throw new Error("Failed to generate feed token");
    }

    return updatedTopic;
  });

export const revokeTopicFeedTokenFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    const existingTopic = await findTopicById(id);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only manage feed tokens for your own topics");
    }

    const updatedTopic = await updateTopicFeedToken(id, null);

    if (!updatedTopic) {
      throw new Error("Failed to revoke feed token");
    }

    return updatedTopic;
  });

// Topic hierarchy functions
export const getTopicHierarchyFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await buildTopicHierarchy(context.userId);
  });

export const getTopicAncestorsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const topic = await findTopicById(data.id);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }
    return await getTopicAncestors(data.id);
  });

export const moveTopicFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      parentId: z.string().nullable(),
      position: z.number().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, parentId, position } = data;

    const existingTopic = await findTopicById(id);
    if (!existingTopic) {
      throw new Error("Topic not found");
    }

    if (existingTopic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only move your own topics");
    }

    // If setting a parent, verify it exists and belongs to the user
    if (parentId !== null) {
      const parentTopic = await findTopicById(parentId);
      if (!parentTopic) {
        throw new Error("Parent topic not found");
      }
      if (parentTopic.userId !== context.userId) {
        throw new Error("Unauthorized: Parent topic must belong to you");
      }
      // Check for cycles
      const canBeParent = await canSetAsParent(id, parentId);
      if (!canBeParent) {
        throw new Error("Cannot set this topic as parent: would create a cycle");
      }
    }

    // Get position if not provided
    const newPosition = position ?? await getNextSiblingPosition(parentId, context.userId);

    const updatedTopic = await updateTopicParent(id, parentId, newPosition);
    if (!updatedTopic) {
      throw new Error("Failed to move topic");
    }

    return updatedTopic;
  });

export const getAvailableParentTopicsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ excludeId: z.string().optional() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const allTopics = await findTopicsByUserId(context.userId);

    // If excludeId is provided, filter out the topic and its descendants
    if (data.excludeId) {
      const topicToExclude = await findTopicById(data.excludeId);
      if (!topicToExclude) {
        return allTopics;
      }

      // Get all descendant IDs to exclude
      const descendantIds = new Set<string>();
      const collectDescendants = async (parentId: string) => {
        const children = allTopics.filter(t => t.parentId === parentId);
        for (const child of children) {
          descendantIds.add(child.id);
          await collectDescendants(child.id);
        }
      };
      await collectDescendants(data.excludeId);

      // Filter out the topic and its descendants
      return allTopics.filter(t => t.id !== data.excludeId && !descendantIds.has(t.id));
    }

    return allTopics;
  });

// Export topics configuration
export const exportTopicsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ topicIds: z.array(z.string()).optional() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const allTopics = await findTopicsByUserId(context.userId);

    // If topicIds provided, filter to only those topics
    const topicsToExport = data.topicIds
      ? allTopics.filter((t) => data.topicIds!.includes(t.id))
      : allTopics;

    return topicsToExport;
  });

// Import topics configuration
const importTopicSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullable().optional(),
  keywords: z.string().min(1),
  monitoringFrequency: z.enum(["hourly", "daily", "weekly"]).optional(),
  includedSources: z.string().nullable().optional(),
  excludedSources: z.string().nullable().optional(),
  languages: z.string().nullable().optional(),
  notificationEnabled: z.boolean().optional(),
  notificationFrequency: z.enum(["daily", "weekly", "none"]).optional(),
  minimumRelevanceScore: z.number().min(0).max(1).optional(),
  // Schedule settings
  scheduleEnabled: z.boolean().optional(),
  scheduleDays: z.string().nullable().optional(),
  scheduleStartHour: z.number().min(0).max(23).nullable().optional(),
  scheduleEndHour: z.number().min(0).max(23).nullable().optional(),
  scheduleTimezone: z.string().nullable().optional(),
});

export const importTopicsFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      topics: z.array(importTopicSchema),
      skipDuplicates: z.boolean().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingTopics = await findTopicsByUserId(context.userId);
    const existingNames = new Set(existingTopics.map((t) => t.name.toLowerCase()));

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const topicData of data.topics) {
      // Check for duplicate names
      if (existingNames.has(topicData.name.toLowerCase())) {
        if (data.skipDuplicates) {
          results.skipped++;
          continue;
        }
        results.errors.push(`Topic "${topicData.name}" already exists`);
        continue;
      }

      try {
        const position = await getNextSiblingPosition(null, context.userId);

        await createTopic({
          id: crypto.randomUUID(),
          name: topicData.name,
          description: topicData.description || null,
          keywords: topicData.keywords,
          monitoringFrequency: topicData.monitoringFrequency || "daily",
          includedSources: topicData.includedSources || null,
          excludedSources: topicData.excludedSources || null,
          languages: topicData.languages || "en",
          notificationEnabled: topicData.notificationEnabled ?? true,
          notificationFrequency: topicData.notificationFrequency || "daily",
          minimumRelevanceScore: topicData.minimumRelevanceScore ?? 0,
          scheduleEnabled: topicData.scheduleEnabled ?? false,
          scheduleDays: topicData.scheduleDays || null,
          scheduleStartHour: topicData.scheduleStartHour ?? null,
          scheduleEndHour: topicData.scheduleEndHour ?? null,
          scheduleTimezone: topicData.scheduleTimezone || "UTC",
          parentId: null,
          position,
          userId: context.userId,
        });

        existingNames.add(topicData.name.toLowerCase());
        results.imported++;
      } catch (error) {
        results.errors.push(
          `Failed to import "${topicData.name}": ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return results;
  });

// Trending topics function (no auth required - public discovery)
export const getTrendingTopicsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ limit: z.number().min(1).max(20).optional() }))
  .handler(async ({ data }) => {
    const limit = data.limit ?? 10;
    return await getTrendingTopics(limit);
  });

// Run topic now - manual trigger for news fetch
import { runTopicNowUseCase } from "~/use-cases/runTopicNowUseCase";

export const runTopicNowFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await runTopicNowUseCase(data.id, context.userId);
  });
