/**
 * Fetch Article Content Use Case
 *
 * Batch processes articles that don't have content yet.
 * Used by the cron job for async content fetching.
 */

import { findArticlesWithoutContent, updateArticle } from "~/data-access/articles";
import { fetchArticleContent } from "~/services/article-content-scraper";

export interface FetchArticleContentResult {
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ articleId: string; url: string; error: string }>;
}

const DELAY_BETWEEN_FETCHES_MS = 500; // Rate limiting

/**
 * Fetches content for articles that don't have it yet.
 * Processes up to `limit` articles with rate limiting between requests.
 */
export async function fetchArticleContentUseCase(
  limit: number = 50
): Promise<FetchArticleContentResult> {
  const articlesWithoutContent = await findArticlesWithoutContent(limit);

  const result: FetchArticleContentResult = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const article of articlesWithoutContent) {
    result.processed++;

    try {
      const contentResult = await fetchArticleContent(article.url);

      if (contentResult.success && contentResult.content) {
        await updateArticle(article.id, { content: contentResult.content });
        result.successful++;
      } else {
        result.failed++;
        result.errors.push({
          articleId: article.id,
          url: article.url,
          error: contentResult.error || "Unknown error",
        });
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        articleId: article.id,
        url: article.url,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Rate limiting delay between requests
    if (result.processed < articlesWithoutContent.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_FETCHES_MS));
    }
  }

  return result;
}
