import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  findSavedSearchById,
  findSavedSearchesByUserId,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  checkSavedSearchOwnership,
} from "~/data-access/saved-searches";

export const getSavedSearchesFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await findSavedSearchesByUserId(context.userId);
  });

export const getSavedSearchByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const search = await findSavedSearchById(data.id);
    if (!search) {
      throw new Error("Saved search not found");
    }
    if (search.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own saved searches");
    }
    return search;
  });

export const createSavedSearchFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      query: z.string().min(1),
      topicIds: z.string().optional(), // JSON string of topic IDs
      source: z.string().optional(),
      dateRangeType: z.string().optional(),
      dateFrom: z.string().optional(), // ISO date string
      dateTo: z.string().optional(), // ISO date string
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const savedSearchData = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      query: data.query,
      topicIds: data.topicIds,
      source: data.source,
      dateRangeType: data.dateRangeType,
      dateFrom: data.dateFrom ? new Date(data.dateFrom) : undefined,
      dateTo: data.dateTo ? new Date(data.dateTo) : undefined,
      userId: context.userId,
    };

    const newSavedSearch = await createSavedSearch(savedSearchData);
    return newSavedSearch;
  });

export const updateSavedSearchFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      query: z.string().min(1).optional(),
      topicIds: z.string().optional(),
      source: z.string().optional(),
      dateRangeType: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, dateFrom, dateTo, ...rest } = data;

    const isOwner = await checkSavedSearchOwnership(id, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only edit your own saved searches");
    }

    const updateData = {
      ...rest,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    const updatedSavedSearch = await updateSavedSearch(id, updateData);
    if (!updatedSavedSearch) {
      throw new Error("Failed to update saved search");
    }

    return updatedSavedSearch;
  });

export const deleteSavedSearchFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    const isOwner = await checkSavedSearchOwnership(id, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only delete your own saved searches");
    }

    const deleted = await deleteSavedSearch(id);
    if (!deleted) {
      throw new Error("Failed to delete saved search");
    }

    return { success: true };
  });
