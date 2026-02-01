import { queryOptions } from "@tanstack/react-query";
import {
  getUserTopicsFn,
  getTopicByIdFn,
  getTopicsCountFn,
  getTopicHierarchyFn,
  getTopicAncestorsFn,
  getAvailableParentTopicsFn,
  getTrendingTopicsFn,
} from "~/fn/topics";

export const getUserTopicsQuery = () =>
  queryOptions({
    queryKey: ["user-topics"],
    queryFn: () => getUserTopicsFn(),
  });

export const getTopicByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["topic", id],
    queryFn: () => getTopicByIdFn({ data: { id } }),
  });

export const getTopicsCountQuery = () =>
  queryOptions({
    queryKey: ["topics-count"],
    queryFn: () => getTopicsCountFn(),
  });

export const getTopicHierarchyQuery = () =>
  queryOptions({
    queryKey: ["topic-hierarchy"],
    queryFn: () => getTopicHierarchyFn(),
  });

export const getTopicAncestorsQuery = (id: string) =>
  queryOptions({
    queryKey: ["topic-ancestors", id],
    queryFn: () => getTopicAncestorsFn({ data: { id } }),
  });

export const getAvailableParentTopicsQuery = (excludeId?: string) =>
  queryOptions({
    queryKey: ["available-parent-topics", excludeId],
    queryFn: () => getAvailableParentTopicsFn({ data: { excludeId } }),
  });

export const getTrendingTopicsQuery = (limit?: number) =>
  queryOptions({
    queryKey: ["trending-topics", limit],
    queryFn: () => getTrendingTopicsFn({ data: { limit } }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
