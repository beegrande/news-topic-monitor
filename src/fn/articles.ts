import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  findArticleById,
  findArticlesByTopicIdWithOptions,
  countArticlesByTopicId,
  getDistinctSourcesByTopicId,
  getDistinctSources,
  getDistinctSentimentsByTopicId,
  getDistinctCountriesByTopicId,
  getCountryDistribution,
  getDistinctLanguagesByTopicId,
  getLanguageDistribution,
  createArticleIfNotExists,
  linkArticleToTopic,
  searchArticles,
  findArticlesWithoutSentiment,
  updateArticle,
  updateArticleRelevanceScore,
  getArticleVolumeOverTime,
  getSentimentDistribution,
  getSourceDistribution,
  getSentimentOverTime,
  getTrendingKeywords,
  type ArticleSortBy,
  type ArticleSortOrder,
} from "~/data-access/articles";
import {
  createArticleInteraction,
  getArticleFeedbackCounts,
  getUserFeedbackForArticle,
  deleteUserFeedback,
} from "~/data-access/article-interactions";
import type { ArticleSentiment, InteractionType } from "~/db/schema";
import { findTopicById, findTopicsByUserId } from "~/data-access/topics";
import { recalculateScoreWithFeedback, calculateInitialRelevanceScore } from "~/services/relevance-scoring";
import { clusterArticles, type ArticleCluster } from "~/services/article-clustering";
import {
  fetchNewsFromApi,
  getRateLimitStatus,
  NewsApiError,
  RateLimitError,
} from "~/services/news-api";
import { analyzeArticleSentiment } from "~/services/sentiment";
import { generateContentFingerprint } from "~/services/content-fingerprint";
import type { NewsApiArticle } from "~/services/news-api";
import {
  checkArticleCredibility,
  getFactCheckRateLimitStatus,
  FactCheckRateLimitError,
  type FactCheckClaim,
} from "~/services/fact-checking";
import {
  detectArticleLanguage,
  parseLanguageList,
  getLanguageName,
  isNewsApiLanguageSupported,
} from "~/services/language-detection";
import { translateArticleSummary } from "~/services/translation";
import { extractLocation } from "~/services/location-extraction";

/**
 * Parses a comma-separated list of sources into an array.
 * Returns empty array if input is null/undefined/empty.
 */
function parseSourceList(sourceList: string | null | undefined): string[] {
  if (!sourceList || sourceList.trim() === "") {
    return [];
  }
  return sourceList
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * Filters articles based on included/excluded source lists.
 * - If includedSources is set: only include articles from those sources
 * - If excludedSources is set: exclude articles from those sources
 * - Both can be used together (include first, then exclude)
 */
function filterArticlesBySource(
  articles: NewsApiArticle[],
  includedSources: string | null | undefined,
  excludedSources: string | null | undefined
): NewsApiArticle[] {
  const included = parseSourceList(includedSources);
  const excluded = parseSourceList(excludedSources);

  return articles.filter((article) => {
    const sourceName = article.source.name.toLowerCase();

    // If included sources are specified, check if article source is in the list
    if (included.length > 0 && !included.includes(sourceName)) {
      return false;
    }

    // If excluded sources are specified, check if article source should be excluded
    if (excluded.length > 0 && excluded.includes(sourceName)) {
      return false;
    }

    return true;
  });
}

export const getArticlesByTopicFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      topicId: z.string(),
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
      sortBy: z.enum(["date", "source", "relevance"]).optional().default("date"),
      sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      source: z.string().optional(),
      sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
      country: z.string().optional(),
      language: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId, limit, offset, sortBy, sortOrder, source, sentiment, country, language } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }

    const articles = await findArticlesByTopicIdWithOptions({
      topicId,
      limit,
      offset,
      sortBy: sortBy as ArticleSortBy,
      sortOrder: sortOrder as ArticleSortOrder,
      source,
      sentiment: sentiment as ArticleSentiment | undefined,
      country,
      language,
    });

    const totalCount = await countArticlesByTopicId(topicId, source, sentiment as ArticleSentiment | undefined, country, language);

    return {
      articles,
      totalCount,
      hasMore: offset + articles.length < totalCount,
    };
  });

export const getArticleByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const article = await findArticleById(data.id);
    if (!article) {
      throw new Error("Article not found");
    }
    return article;
  });

export const getArticleSourcesFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ topicId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }

    const sources = await getDistinctSourcesByTopicId(topicId);
    return sources;
  });

export const fetchNewsForTopicFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      topicId: z.string(),
      pageSize: z.number().min(1).max(100).optional().default(20),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId, pageSize } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only fetch news for your own topics");
    }

    try {
      // Get topic's language preferences (default to English if not set)
      const topicLanguages = parseLanguageList(topic.languages);

      // Store articles and link them to the topic
      let newArticlesCount = 0;
      let existingArticlesCount = 0;
      let totalFetched = 0;

      // Fetch news for each language the topic monitors
      for (const language of topicLanguages) {
        // Only fetch for NewsAPI-supported languages
        if (!isNewsApiLanguageSupported(language)) {
          continue;
        }

        const allNewsArticles = await fetchNewsFromApi({
          query: topic.keywords,
          pageSize: Math.ceil(pageSize / topicLanguages.length), // Split page size across languages
          sortBy: "publishedAt",
          language,
        });

        // Apply source filtering based on topic settings
        const newsArticles = filterArticlesBySource(
          allNewsArticles,
          topic.includedSources,
          topic.excludedSources
        );

        totalFetched += newsArticles.length;

        for (const newsArticle of newsArticles) {
          // Detect language of the article content (use NewsAPI language as fallback)
          const languageResult = detectArticleLanguage(
            newsArticle.title,
            newsArticle.description || newsArticle.content,
            language // Use the requested language as fallback
          );

          // Translate summary to English if it's in a different language
          const translatedSummary = await translateArticleSummary(
            newsArticle.description,
            languageResult.language
          );

          // Analyze sentiment of the article (use translated summary if available)
          const sentimentResult = analyzeArticleSentiment(
            newsArticle.title,
            translatedSummary || newsArticle.description
          );

          // Generate content fingerprint for duplicate detection
          const contentHash = generateContentFingerprint(
            newsArticle.title,
            newsArticle.description || newsArticle.content
          );

          // Extract geographic location from title and content
          const locationInfo = extractLocation(
            newsArticle.title,
            newsArticle.description || newsArticle.content
          );

          const { article, created } = await createArticleIfNotExists({
            id: crypto.randomUUID(),
            title: newsArticle.title,
            content: newsArticle.content,
            summary: newsArticle.description,
            source: newsArticle.source.name,
            url: newsArticle.url,
            publishedAt: newsArticle.publishedAt
              ? new Date(newsArticle.publishedAt)
              : null,
            sentiment: sentimentResult.sentiment,
            sentimentScore: sentimentResult.score,
            contentHash,
            // Multi-language fields
            language: languageResult.language,
            originalLanguage: languageResult.language !== "en" ? languageResult.language : null,
            translatedSummary,
            // Geographic location fields
            country: locationInfo.country,
            countryCode: locationInfo.countryCode,
            city: locationInfo.city,
            region: locationInfo.region,
          });

          // Calculate initial relevance score
          const initialScore = calculateInitialRelevanceScore(article, topic);

          // Link the article to the topic with relevance score
          await linkArticleToTopic(article.id, topicId, initialScore);

          if (created) {
            newArticlesCount++;
          } else {
            existingArticlesCount++;
          }
        }
      }

      return {
        success: true,
        totalFetched,
        newArticles: newArticlesCount,
        existingArticles: existingArticlesCount,
        languagesFetched: topicLanguages.filter(isNewsApiLanguageSupported),
      };
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new Error(
          `Rate limit exceeded. Please try again in ${Math.ceil(error.retryAfterMs / 60000)} minutes.`
        );
      }
      if (error instanceof NewsApiError) {
        throw new Error(`News API error: ${error.message}`);
      }
      throw error;
    }
  });

export const getNewsRateLimitStatusFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    const status = getRateLimitStatus();
    return {
      requestsRemaining: status.maxRequests - status.requestCount,
      maxRequests: status.maxRequests,
      windowResetMinutes: Math.ceil(status.windowResetMs / 60000),
    };
  });

export const searchArticlesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      query: z.string().min(1),
      topicIds: z.array(z.string()).optional(),
      source: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { query, topicIds, source, dateFrom, dateTo, limit, offset } = data;

    // Get user's topics to restrict search scope
    const userTopics = await findTopicsByUserId(context.userId);
    const userTopicIds = userTopics.map((t) => t.id);

    // If specific topics requested, verify user owns them
    let searchTopicIds: string[] | undefined;
    if (topicIds && topicIds.length > 0) {
      // Filter to only topics the user owns
      searchTopicIds = topicIds.filter((id) => userTopicIds.includes(id));
      if (searchTopicIds.length === 0) {
        return {
          articles: [],
          totalCount: 0,
          hasMore: false,
        };
      }
    } else {
      // Search across all user's topics
      searchTopicIds = userTopicIds;
    }

    // If user has no topics, return empty results
    if (searchTopicIds.length === 0) {
      return {
        articles: [],
        totalCount: 0,
        hasMore: false,
      };
    }

    const result = await searchArticles({
      query,
      topicIds: searchTopicIds,
      source,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit,
      offset,
    });

    return {
      articles: result.articles,
      totalCount: result.totalCount,
      hasMore: offset + result.articles.length < result.totalCount,
    };
  });

export const getArticleSourcesAllFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    const sources = await getDistinctSources();
    return sources;
  });

export const getArticleSentimentsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ topicId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }

    const sentiments = await getDistinctSentimentsByTopicId(topicId);
    return sentiments;
  });

export const getArticleCountriesFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ topicId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }

    const countries = await getDistinctCountriesByTopicId(topicId);
    return countries;
  });

export const getCountryDistributionFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ topicId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }

    const distribution = await getCountryDistribution(topicId);
    return distribution;
  });

export const getArticleLanguagesFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ topicId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }

    const languages = await getDistinctLanguagesByTopicId(topicId);
    // Return languages with their display names
    return languages.map((code) => ({
      code,
      name: getLanguageName(code),
    }));
  });

export const getLanguageDistributionFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ topicId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }

    const distribution = await getLanguageDistribution(topicId);
    // Add language names to the distribution
    return distribution.map((item) => ({
      ...item,
      languageName: getLanguageName(item.language),
    }));
  });

export const analyzeExistingArticlesSentimentFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ limit: z.number().min(1).max(100).optional().default(50) }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const { limit } = data;

    // Find articles without sentiment
    const articlesWithoutSentiment = await findArticlesWithoutSentiment(limit);

    let analyzedCount = 0;

    for (const articleData of articlesWithoutSentiment) {
      const sentimentResult = analyzeArticleSentiment(
        articleData.title,
        articleData.summary
      );

      await updateArticle(articleData.id, {
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
      });

      analyzedCount++;
    }

    return {
      success: true,
      analyzedCount,
      remainingWithoutSentiment: articlesWithoutSentiment.length < limit ? 0 : "more available",
    };
  });

export const recordArticleClickFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      articleId: z.string(),
      topicId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { articleId, topicId } = data;

    // Verify article exists
    const article = await findArticleById(articleId);
    if (!article) {
      throw new Error("Article not found");
    }

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    // Record the click interaction
    await createArticleInteraction({
      id: crypto.randomUUID(),
      userId: context.userId,
      articleId,
      topicId,
      interactionType: "click",
    });

    return { success: true };
  });

export const submitArticleFeedbackFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      articleId: z.string(),
      topicId: z.string(),
      feedback: z.enum(["helpful", "not_helpful"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { articleId, topicId, feedback } = data;

    // Verify article exists
    const article = await findArticleById(articleId);
    if (!article) {
      throw new Error("Article not found");
    }

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    // Remove any existing feedback from this user for this article/topic
    await deleteUserFeedback(context.userId, articleId, topicId);

    // Record the new feedback
    await createArticleInteraction({
      id: crypto.randomUUID(),
      userId: context.userId,
      articleId,
      topicId,
      interactionType: feedback as InteractionType,
    });

    // Recalculate relevance score based on all feedback
    const feedbackCounts = await getArticleFeedbackCounts(articleId, topicId);
    const newScore = recalculateScoreWithFeedback(
      article,
      topic,
      feedbackCounts.helpfulCount,
      feedbackCounts.notHelpfulCount
    );

    await updateArticleRelevanceScore(articleId, topicId, newScore);

    return {
      success: true,
      newRelevanceScore: newScore,
      feedbackCounts,
    };
  });

export const getArticleFeedbackFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      articleId: z.string(),
      topicId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { articleId, topicId } = data;

    // Verify topic belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    const feedbackCounts = await getArticleFeedbackCounts(articleId, topicId);
    const userFeedback = await getUserFeedbackForArticle(
      context.userId,
      articleId,
      topicId
    );

    return {
      ...feedbackCounts,
      userFeedback,
    };
  });

export const removeArticleFeedbackFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      articleId: z.string(),
      topicId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { articleId, topicId } = data;

    // Verify article exists
    const article = await findArticleById(articleId);
    if (!article) {
      throw new Error("Article not found");
    }

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    // Remove feedback
    await deleteUserFeedback(context.userId, articleId, topicId);

    // Recalculate relevance score
    const feedbackCounts = await getArticleFeedbackCounts(articleId, topicId);
    const newScore = recalculateScoreWithFeedback(
      article,
      topic,
      feedbackCounts.helpfulCount,
      feedbackCounts.notHelpfulCount
    );

    await updateArticleRelevanceScore(articleId, topicId, newScore);

    return {
      success: true,
      newRelevanceScore: newScore,
      feedbackCounts,
    };
  });

export const getTopicAnalyticsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      topicId: z.string(),
      days: z.number().min(1).max(365).optional().default(30),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId, days } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view analytics for your own topics");
    }

    // Fetch all analytics data in parallel
    const [
      articleVolume,
      sentimentDistribution,
      sourceDistribution,
      sentimentOverTime,
      trendingKeywords,
      countryDistribution,
    ] = await Promise.all([
      getArticleVolumeOverTime(topicId, days),
      getSentimentDistribution(topicId),
      getSourceDistribution(topicId),
      getSentimentOverTime(topicId, days),
      getTrendingKeywords(topicId, 20, 7),
      getCountryDistribution(topicId),
    ]);

    return {
      articleVolume,
      sentimentDistribution,
      sourceDistribution,
      sentimentOverTime,
      trendingKeywords,
      countryDistribution,
    };
  });

export const getClusteredArticlesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      topicId: z.string(),
      limit: z.number().min(1).max(200).optional().default(50),
      similarityThreshold: z.number().min(0).max(1).optional().default(0.3),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { topicId, limit, similarityThreshold } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view your own topics");
    }

    // Fetch articles for the topic (sorted by date desc for best representative selection)
    const articles = await findArticlesByTopicIdWithOptions({
      topicId,
      limit,
      offset: 0,
      sortBy: "date",
      sortOrder: "desc",
    });

    // Cluster the articles
    const clusters = clusterArticles(articles, similarityThreshold);

    return {
      clusters,
      totalArticles: articles.length,
      totalClusters: clusters.length,
    };
  });

export const checkArticleFactsFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      articleId: z.string(),
      topicId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { articleId, topicId } = data;

    // Verify article exists
    const article = await findArticleById(articleId);
    if (!article) {
      throw new Error("Article not found");
    }

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    try {
      // Check article credibility using Google Fact Check API
      const result = await checkArticleCredibility(article.title, article.summary);

      // Update article with fact-check results
      await updateArticle(articleId, {
        factCheckStatus: result.status,
        credibilityScore: result.credibilityScore,
        factCheckSources: JSON.stringify(result.claims),
        factCheckedAt: result.checkedAt,
      });

      return {
        success: true,
        status: result.status,
        credibilityScore: result.credibilityScore,
        claims: result.claims,
        checkedAt: result.checkedAt,
      };
    } catch (error) {
      if (error instanceof FactCheckRateLimitError) {
        throw new Error(
          `Rate limit exceeded. Please try again in ${Math.ceil(error.retryAfterMs / 60000)} minutes.`
        );
      }
      throw error;
    }
  });

export const getFactCheckStatusFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      articleId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const { articleId } = data;

    const article = await findArticleById(articleId);
    if (!article) {
      throw new Error("Article not found");
    }

    let claims: FactCheckClaim[] = [];
    if (article.factCheckSources) {
      try {
        claims = JSON.parse(article.factCheckSources);
      } catch {
        claims = [];
      }
    }

    return {
      status: article.factCheckStatus,
      credibilityScore: article.credibilityScore,
      claims,
      checkedAt: article.factCheckedAt,
    };
  });

export const getFactCheckRateLimitFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    const status = getFactCheckRateLimitStatus();
    return {
      requestsRemaining: status.maxRequests - status.requestCount,
      maxRequests: status.maxRequests,
      windowResetMinutes: Math.ceil(status.windowResetMs / 60000),
    };
  });
