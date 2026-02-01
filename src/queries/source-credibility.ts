import { queryOptions } from "@tanstack/react-query";
import {
  getSourceCredibilityFn,
  getAllSourceCredibilitiesFn,
  getSourceCredibilityOverviewFn,
  getUserSourceFeedbackFn,
  getSourceFeedbackListFn,
} from "~/fn/source-credibility";

export const getSourceCredibilityQuery = (sourceName: string) =>
  queryOptions({
    queryKey: ["source-credibility", sourceName],
    queryFn: () => getSourceCredibilityFn({ data: { sourceName } }),
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });

export interface GetAllSourceCredibilitiesParams {
  limit?: number;
  offset?: number;
}

export const getAllSourceCredibilitiesQuery = (
  params: GetAllSourceCredibilitiesParams = {}
) =>
  queryOptions({
    queryKey: ["source-credibilities", params.limit, params.offset],
    queryFn: () => getAllSourceCredibilitiesFn({ data: params }),
    staleTime: 5 * 60 * 1000,
  });

export const getSourceCredibilityOverviewQuery = (limit?: number) =>
  queryOptions({
    queryKey: ["source-credibility-overview", limit],
    queryFn: () => getSourceCredibilityOverviewFn({ data: { limit } }),
    staleTime: 5 * 60 * 1000,
  });

export const getUserSourceFeedbackQuery = (sourceName: string) =>
  queryOptions({
    queryKey: ["user-source-feedback", sourceName],
    queryFn: () => getUserSourceFeedbackFn({ data: { sourceName } }),
    staleTime: 60 * 1000, // Consider stale after 1 minute
  });

export interface GetSourceFeedbackListParams {
  sourceName: string;
  limit?: number;
  offset?: number;
}

export const getSourceFeedbackListQuery = (params: GetSourceFeedbackListParams) =>
  queryOptions({
    queryKey: [
      "source-feedback-list",
      params.sourceName,
      params.limit,
      params.offset,
    ],
    queryFn: () => getSourceFeedbackListFn({ data: params }),
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
  });
