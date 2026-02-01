import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  findArticlesForExport,
  countArticlesForExport,
} from "~/data-access/articles";
import { findTopicById } from "~/data-access/topics";
import type { ArticleSentiment } from "~/db/schema";
import {
  articleToExportFormat,
  articlesToCsv,
  articlesToJson,
  type ExportArticle,
} from "~/utils/export";

const exportInputSchema = z.object({
  topicId: z.string(),
  format: z.enum(["csv", "json"]),
  source: z.string().optional(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
});

const exportPreviewSchema = z.object({
  topicId: z.string(),
  source: z.string().optional(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const getExportPreviewFn = createServerFn({
  method: "GET",
})
  .inputValidator(exportPreviewSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId, source, sentiment, dateFrom, dateTo } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only export your own topics");
    }

    const count = await countArticlesForExport({
      topicId,
      source,
      sentiment: sentiment as ArticleSentiment | undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    return {
      count,
      topicName: topic.name,
      topicDescription: topic.description,
    };
  });

export const exportArticlesFn = createServerFn({
  method: "GET",
})
  .inputValidator(exportInputSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId, format, source, sentiment, dateFrom, dateTo } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only export your own topics");
    }

    const articles = await findArticlesForExport({
      topicId,
      source,
      sentiment: sentiment as ArticleSentiment | undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    const exportArticles: ExportArticle[] = articles.map(articleToExportFormat);

    if (format === "csv") {
      return {
        content: articlesToCsv(exportArticles),
        mimeType: "text/csv",
        filename: `${topic.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-articles.csv`,
      };
    } else {
      const jsonExport = articlesToJson(exportArticles, {
        topicName: topic.name,
        topicDescription: topic.description,
        filters: {
          source,
          sentiment,
          dateFrom,
          dateTo,
        },
      });
      return {
        content: JSON.stringify(jsonExport, null, 2),
        mimeType: "application/json",
        filename: `${topic.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-articles.json`,
      };
    }
  });
