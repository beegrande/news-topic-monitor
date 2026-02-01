import { eq, desc, asc, and, inArray, sql, gte, lte, isNull } from "drizzle-orm";
import { database } from "~/db";
import {
  article,
  articleTopic,
  topic,
  type Article,
  type CreateArticleData,
  type UpdateArticleData,
  type CreateArticleTopicData,
  type ArticleSentiment,
  type FactCheckStatus,
} from "~/db/schema";

export type ArticleWithTopics = Article & {
  topics: { id: string; name: string }[];
};

export async function findArticleById(id: string): Promise<Article | null> {
  const [result] = await database
    .select()
    .from(article)
    .where(eq(article.id, id))
    .limit(1);

  return result || null;
}

export async function findArticleByUrl(url: string): Promise<Article | null> {
  const [result] = await database
    .select()
    .from(article)
    .where(eq(article.url, url))
    .limit(1);

  return result || null;
}

export async function findArticleByContentHash(
  contentHash: string
): Promise<Article | null> {
  const [result] = await database
    .select()
    .from(article)
    .where(eq(article.contentHash, contentHash))
    .limit(1);

  return result || null;
}

export async function createArticle(
  articleData: CreateArticleData
): Promise<Article> {
  const [newArticle] = await database
    .insert(article)
    .values({
      ...articleData,
      updatedAt: new Date(),
    })
    .returning();

  return newArticle;
}

/**
 * Creates an article if it doesn't already exist (based on URL or content hash).
 * Returns the existing article if found, or the newly created article.
 * Checks both URL uniqueness and content hash to detect duplicates from different sources.
 */
export async function createArticleIfNotExists(
  articleData: CreateArticleData
): Promise<{ article: Article; created: boolean; duplicateType?: "url" | "content" }> {
  // First check URL uniqueness
  const existingByUrl = await findArticleByUrl(articleData.url);
  if (existingByUrl) {
    return { article: existingByUrl, created: false, duplicateType: "url" };
  }

  // Then check content hash if provided
  if (articleData.contentHash) {
    const existingByHash = await findArticleByContentHash(articleData.contentHash);
    if (existingByHash) {
      return { article: existingByHash, created: false, duplicateType: "content" };
    }
  }

  const newArticle = await createArticle(articleData);
  return { article: newArticle, created: true };
}

export async function updateArticle(
  id: string,
  articleData: UpdateArticleData
): Promise<Article | null> {
  const [updatedArticle] = await database
    .update(article)
    .set({
      ...articleData,
      updatedAt: new Date(),
    })
    .where(eq(article.id, id))
    .returning();

  return updatedArticle || null;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const result = await database
    .delete(article)
    .where(eq(article.id, id))
    .returning();

  return result.length > 0;
}

export async function findRecentArticles(
  limit: number = 20
): Promise<Article[]> {
  return await database
    .select()
    .from(article)
    .where(eq(article.isArchived, false))
    .orderBy(desc(article.publishedAt))
    .limit(limit);
}

export type ArticleSortBy = "date" | "source" | "relevance";
export type ArticleSortOrder = "asc" | "desc";

export interface FindArticlesByTopicOptions {
  topicId: string;
  limit?: number;
  offset?: number;
  sortBy?: ArticleSortBy;
  sortOrder?: ArticleSortOrder;
  source?: string;
  sentiment?: ArticleSentiment;
  country?: string;
  language?: string;
}

export async function findArticlesByTopicId(
  topicId: string,
  limit: number = 50
): Promise<Article[]> {
  const results = await database
    .select({ article })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(and(eq(articleTopic.topicId, topicId), eq(article.isArchived, false)))
    .orderBy(desc(article.publishedAt))
    .limit(limit);

  return results.map((r) => r.article);
}

export type ArticleWithRelevance = Article & {
  relevanceScore: number | null;
};

export async function findArticlesByTopicIdWithOptions(
  options: FindArticlesByTopicOptions
): Promise<ArticleWithRelevance[]> {
  const {
    topicId,
    limit = 20,
    offset = 0,
    sortBy = "date",
    sortOrder = "desc",
    source,
    sentiment,
    country,
    language,
  } = options;

  // Build where conditions - exclude archived articles by default
  const conditions = [eq(articleTopic.topicId, topicId), eq(article.isArchived, false)];

  if (source) {
    conditions.push(eq(article.source, source));
  }

  if (sentiment) {
    conditions.push(eq(article.sentiment, sentiment));
  }

  if (country) {
    conditions.push(eq(article.country, country));
  }

  if (language) {
    conditions.push(eq(article.language, language));
  }

  // Build order by clause based on sortBy
  let orderByClause;
  const orderFn = sortOrder === "asc" ? asc : desc;

  if (sortBy === "relevance") {
    // Sort by relevance score, then by date as secondary sort
    orderByClause =
      sortOrder === "desc"
        ? [desc(articleTopic.relevanceScore), desc(article.publishedAt)]
        : [asc(articleTopic.relevanceScore), asc(article.publishedAt)];
  } else if (sortBy === "source") {
    orderByClause = [orderFn(article.source)];
  } else {
    // Default to date
    orderByClause = [orderFn(article.publishedAt)];
  }

  const results = await database
    .select({
      article,
      relevanceScore: articleTopic.relevanceScore,
    })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(and(...conditions))
    .orderBy(...orderByClause)
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r.article,
    relevanceScore: r.relevanceScore,
  }));
}

export async function countArticlesByTopicId(
  topicId: string,
  source?: string,
  sentiment?: ArticleSentiment,
  country?: string,
  language?: string
): Promise<number> {
  const conditions = [eq(articleTopic.topicId, topicId), eq(article.isArchived, false)];

  if (source) {
    conditions.push(eq(article.source, source));
  }

  if (sentiment) {
    conditions.push(eq(article.sentiment, sentiment));
  }

  if (country) {
    conditions.push(eq(article.country, country));
  }

  if (language) {
    conditions.push(eq(article.language, language));
  }

  const [result] = await database
    .select({ count: sql<number>`count(*)` })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(and(...conditions));

  return Number(result?.count || 0);
}

export async function getDistinctSourcesByTopicId(
  topicId: string
): Promise<string[]> {
  const results = await database
    .selectDistinct({ source: article.source })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(and(eq(articleTopic.topicId, topicId), eq(article.isArchived, false)))
    .orderBy(asc(article.source));

  return results.map((row) => row.source);
}

/**
 * Get distinct countries for articles in a topic.
 */
export async function getDistinctCountriesByTopicId(
  topicId: string
): Promise<string[]> {
  const results = await database
    .selectDistinct({ country: article.country })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(
      and(
        eq(articleTopic.topicId, topicId),
        eq(article.isArchived, false),
        sql`${article.country} IS NOT NULL`
      )
    )
    .orderBy(asc(article.country));

  return results.map((row) => row.country).filter((c): c is string => c !== null);
}

/**
 * Get distinct languages for articles in a topic.
 */
export async function getDistinctLanguagesByTopicId(
  topicId: string
): Promise<string[]> {
  const results = await database
    .selectDistinct({ language: article.language })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(
      and(
        eq(articleTopic.topicId, topicId),
        eq(article.isArchived, false),
        sql`${article.language} IS NOT NULL`
      )
    )
    .orderBy(asc(article.language));

  return results.map((row) => row.language).filter((l): l is string => l !== null);
}

export interface LanguageDistribution {
  language: string;
  count: number;
}

/**
 * Get language distribution for a topic (for visualization).
 */
export async function getLanguageDistribution(
  topicId: string
): Promise<LanguageDistribution[]> {
  const results = await database
    .select({
      language: article.language,
      count: sql<number>`count(*)::int`,
    })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(
      and(
        eq(articleTopic.topicId, topicId),
        eq(article.isArchived, false),
        sql`${article.language} IS NOT NULL`
      )
    )
    .groupBy(article.language)
    .orderBy(sql`count(*) DESC`);

  return results
    .filter((r): r is { language: string; count: number } => r.language !== null)
    .map((r) => ({
      language: r.language,
      count: r.count,
    }));
}

export interface CountryDistribution {
  country: string;
  countryCode: string | null;
  count: number;
}

/**
 * Get country distribution for a topic (for visualization).
 */
export async function getCountryDistribution(
  topicId: string
): Promise<CountryDistribution[]> {
  const results = await database
    .select({
      country: article.country,
      countryCode: article.countryCode,
      count: sql<number>`count(*)::int`,
    })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(
      and(
        eq(articleTopic.topicId, topicId),
        eq(article.isArchived, false),
        sql`${article.country} IS NOT NULL`
      )
    )
    .groupBy(article.country, article.countryCode)
    .orderBy(sql`count(*) DESC`);

  return results
    .filter((r): r is { country: string; countryCode: string | null; count: number } => r.country !== null)
    .map((r) => ({
      country: r.country,
      countryCode: r.countryCode,
      count: r.count,
    }));
}

export async function linkArticleToTopic(
  articleId: string,
  topicId: string,
  relevanceScore?: number
): Promise<void> {
  const [existing] = await database
    .select()
    .from(articleTopic)
    .where(
      and(
        eq(articleTopic.articleId, articleId),
        eq(articleTopic.topicId, topicId)
      )
    )
    .limit(1);

  if (existing) {
    return;
  }

  await database.insert(articleTopic).values({
    id: crypto.randomUUID(),
    articleId,
    topicId,
    relevanceScore: relevanceScore ?? 0.5,
  });
}

export async function updateArticleRelevanceScore(
  articleId: string,
  topicId: string,
  score: number
): Promise<boolean> {
  const result = await database
    .update(articleTopic)
    .set({ relevanceScore: score })
    .where(
      and(
        eq(articleTopic.articleId, articleId),
        eq(articleTopic.topicId, topicId)
      )
    )
    .returning();

  return result.length > 0;
}

export async function getArticleRelevanceScore(
  articleId: string,
  topicId: string
): Promise<number | null> {
  const [result] = await database
    .select({ relevanceScore: articleTopic.relevanceScore })
    .from(articleTopic)
    .where(
      and(
        eq(articleTopic.articleId, articleId),
        eq(articleTopic.topicId, topicId)
      )
    )
    .limit(1);

  return result?.relevanceScore ?? null;
}

export async function unlinkArticleFromTopic(
  articleId: string,
  topicId: string
): Promise<boolean> {
  const result = await database
    .delete(articleTopic)
    .where(
      and(
        eq(articleTopic.articleId, articleId),
        eq(articleTopic.topicId, topicId)
      )
    )
    .returning();

  return result.length > 0;
}

export async function findArticleWithTopics(
  id: string
): Promise<ArticleWithTopics | null> {
  const articleData = await findArticleById(id);
  if (!articleData) return null;

  const topics = await database
    .select({
      id: topic.id,
      name: topic.name,
    })
    .from(articleTopic)
    .innerJoin(topic, eq(articleTopic.topicId, topic.id))
    .where(eq(articleTopic.articleId, id));

  return {
    ...articleData,
    topics,
  };
}

export async function findRecentArticlesWithTopics(
  limit: number = 20
): Promise<ArticleWithTopics[]> {
  const articles = await findRecentArticles(limit);

  if (articles.length === 0) {
    return [];
  }

  const articleIds = articles.map((a) => a.id);

  const topicLinks = await database
    .select({
      articleId: articleTopic.articleId,
      topicId: topic.id,
      topicName: topic.name,
    })
    .from(articleTopic)
    .innerJoin(topic, eq(articleTopic.topicId, topic.id))
    .where(inArray(articleTopic.articleId, articleIds));

  const topicsByArticle = new Map<string, { id: string; name: string }[]>();
  for (const link of topicLinks) {
    const existing = topicsByArticle.get(link.articleId) || [];
    existing.push({ id: link.topicId, name: link.topicName });
    topicsByArticle.set(link.articleId, existing);
  }

  return articles.map((a) => ({
    ...a,
    topics: topicsByArticle.get(a.id) || [],
  }));
}

export interface SearchArticlesOptions {
  query: string;
  topicIds?: string[];
  source?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface SearchArticlesResult {
  articles: Article[];
  totalCount: number;
}

export async function searchArticles(
  options: SearchArticlesOptions
): Promise<SearchArticlesResult> {
  const {
    query,
    topicIds,
    source,
    dateFrom,
    dateTo,
    limit = 20,
    offset = 0,
  } = options;

  // Build the full-text search condition
  // Use plainto_tsquery for more forgiving search (handles phrases without special syntax)
  const searchCondition = sql`(
    to_tsvector('english', coalesce(${article.title}, '')) ||
    to_tsvector('english', coalesce(${article.summary}, '')) ||
    to_tsvector('english', coalesce(${article.content}, ''))
  ) @@ plainto_tsquery('english', ${query})`;

  // Build where conditions array
  const conditions = [searchCondition];

  if (source) {
    conditions.push(eq(article.source, source));
  }

  if (dateFrom) {
    conditions.push(sql`${article.publishedAt} >= ${dateFrom}`);
  }

  if (dateTo) {
    conditions.push(sql`${article.publishedAt} <= ${dateTo}`);
  }

  // If filtering by topics, we need to join with articleTopic
  if (topicIds && topicIds.length > 0) {
    // Get articles that belong to any of the specified topics
    const articlesInTopics = database
      .selectDistinct({ articleId: articleTopic.articleId })
      .from(articleTopic)
      .where(inArray(articleTopic.topicId, topicIds));

    conditions.push(inArray(article.id, articlesInTopics));
  }

  // Get total count
  const [countResult] = await database
    .select({ count: sql<number>`count(*)` })
    .from(article)
    .where(and(...conditions));

  const totalCount = Number(countResult?.count || 0);

  // Get articles with relevance ranking
  const results = await database
    .select({
      article,
      rank: sql<number>`ts_rank(
        to_tsvector('english', coalesce(${article.title}, '')) ||
        to_tsvector('english', coalesce(${article.summary}, '')) ||
        to_tsvector('english', coalesce(${article.content}, '')),
        plainto_tsquery('english', ${query})
      )`,
    })
    .from(article)
    .where(and(...conditions))
    .orderBy(sql`rank DESC`, desc(article.publishedAt))
    .limit(limit)
    .offset(offset);

  return {
    articles: results.map((r) => r.article),
    totalCount,
  };
}

export async function getDistinctSources(): Promise<string[]> {
  const results = await database
    .selectDistinct({ source: article.source })
    .from(article)
    .orderBy(asc(article.source));

  return results.map((row) => row.source);
}

/**
 * Find articles that don't have sentiment analysis yet.
 */
export async function findArticlesWithoutSentiment(
  limit: number = 50
): Promise<Article[]> {
  return await database
    .select()
    .from(article)
    .where(sql`${article.sentiment} IS NULL`)
    .limit(limit);
}

/**
 * Get distinct sentiments for a topic (for filter dropdown).
 */
export async function getDistinctSentimentsByTopicId(
  topicId: string
): Promise<ArticleSentiment[]> {
  const results = await database
    .selectDistinct({ sentiment: article.sentiment })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(
      and(
        eq(articleTopic.topicId, topicId),
        sql`${article.sentiment} IS NOT NULL`
      )
    )
    .orderBy(asc(article.sentiment));

  return results
    .map((row) => row.sentiment)
    .filter((s): s is ArticleSentiment => s !== null);
}

// Analytics functions

export interface ArticleVolumeDataPoint {
  date: string;
  count: number;
}

/**
 * Get article volume over time for a topic.
 * Returns daily counts for the specified number of days.
 */
export async function getArticleVolumeOverTime(
  topicId: string,
  days: number = 30
): Promise<ArticleVolumeDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const results = await database
    .select({
      date: sql<string>`DATE(${article.publishedAt})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(
      and(
        eq(articleTopic.topicId, topicId),
        sql`${article.publishedAt} >= ${startDate}`
      )
    )
    .groupBy(sql`DATE(${article.publishedAt})`)
    .orderBy(sql`DATE(${article.publishedAt})`);

  return results.map((r) => ({
    date: r.date,
    count: r.count,
  }));
}

export interface SentimentDistribution {
  sentiment: string;
  count: number;
}

/**
 * Get sentiment distribution for a topic.
 */
export async function getSentimentDistribution(
  topicId: string
): Promise<SentimentDistribution[]> {
  const results = await database
    .select({
      sentiment: sql<string>`COALESCE(${article.sentiment}, 'unknown')`,
      count: sql<number>`count(*)::int`,
    })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(eq(articleTopic.topicId, topicId))
    .groupBy(sql`COALESCE(${article.sentiment}, 'unknown')`);

  return results;
}

export interface SourceDistribution {
  source: string;
  count: number;
}

/**
 * Get source distribution for a topic.
 */
export async function getSourceDistribution(
  topicId: string
): Promise<SourceDistribution[]> {
  const results = await database
    .select({
      source: article.source,
      count: sql<number>`count(*)::int`,
    })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(eq(articleTopic.topicId, topicId))
    .groupBy(article.source)
    .orderBy(sql`count(*) DESC`);

  return results;
}

export interface SentimentOverTimeDataPoint {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

/**
 * Get sentiment trends over time for a topic.
 */
export async function getSentimentOverTime(
  topicId: string,
  days: number = 30
): Promise<SentimentOverTimeDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const results = await database
    .select({
      date: sql<string>`DATE(${article.publishedAt})::text`,
      sentiment: article.sentiment,
      count: sql<number>`count(*)::int`,
    })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(
      and(
        eq(articleTopic.topicId, topicId),
        sql`${article.publishedAt} >= ${startDate}`,
        sql`${article.sentiment} IS NOT NULL`
      )
    )
    .groupBy(sql`DATE(${article.publishedAt})`, article.sentiment)
    .orderBy(sql`DATE(${article.publishedAt})`);

  // Transform into the required format
  const dateMap = new Map<string, SentimentOverTimeDataPoint>();

  for (const row of results) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, {
        date: row.date,
        positive: 0,
        negative: 0,
        neutral: 0,
      });
    }
    const entry = dateMap.get(row.date)!;
    if (row.sentiment === "positive") entry.positive = row.count;
    else if (row.sentiment === "negative") entry.negative = row.count;
    else if (row.sentiment === "neutral") entry.neutral = row.count;
  }

  return Array.from(dateMap.values());
}

export interface KeywordCount {
  keyword: string;
  count: number;
}

/**
 * Extract trending keywords from recent article titles and summaries.
 * Uses simple word frequency analysis.
 */
export async function getTrendingKeywords(
  topicId: string,
  limit: number = 20,
  days: number = 7
): Promise<KeywordCount[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const results = await database
    .select({
      title: article.title,
      summary: article.summary,
    })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(
      and(
        eq(articleTopic.topicId, topicId),
        sql`${article.publishedAt} >= ${startDate}`
      )
    );

  // Count word frequency
  const wordCounts = new Map<string, number>();
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "through", "during",
    "before", "after", "above", "below", "between", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "each", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "can", "will", "just", "should", "now", "also", "its", "it", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "having", "would", "could", "should", "that", "this", "these",
    "those", "which", "who", "whom", "what", "their", "they", "them", "his",
    "her", "he", "she", "as", "if", "while", "although", "because", "until",
    "unless", "since", "however", "therefore", "thus", "hence", "says", "said",
    "new", "over", "may", "one", "two", "first", "last", "year", "years",
  ]);

  for (const row of results) {
    const text = `${row.title || ""} ${row.summary || ""}`.toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];

    for (const word of words) {
      if (!stopWords.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
  }

  // Sort by count and return top keywords
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword, count]) => ({ keyword, count }));
}

// ============================================================================
// Article Archive Functions
// ============================================================================

export interface ArchiveResult {
  archivedCount: number;
  archivedArticleIds: string[];
}

/**
 * Archives articles older than the specified number of days.
 * Articles are marked as archived rather than deleted.
 */
export async function archiveOldArticles(
  daysOld: number = 30
): Promise<ArchiveResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const articlesToArchive = await database
    .select({ id: article.id })
    .from(article)
    .where(
      and(
        eq(article.isArchived, false),
        sql`${article.createdAt} < ${cutoffDate}`
      )
    );

  if (articlesToArchive.length === 0) {
    return { archivedCount: 0, archivedArticleIds: [] };
  }

  const articleIds = articlesToArchive.map((a) => a.id);
  const now = new Date();

  await database
    .update(article)
    .set({
      isArchived: true,
      archivedAt: now,
      updatedAt: now,
    })
    .where(inArray(article.id, articleIds));

  return {
    archivedCount: articleIds.length,
    archivedArticleIds: articleIds,
  };
}

/**
 * Finds archived articles with optional pagination.
 */
export async function findArchivedArticles(
  limit: number = 50,
  offset: number = 0
): Promise<Article[]> {
  return await database
    .select()
    .from(article)
    .where(eq(article.isArchived, true))
    .orderBy(desc(article.archivedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Counts total number of archived articles.
 */
export async function countArchivedArticles(): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)` })
    .from(article)
    .where(eq(article.isArchived, true));

  return Number(result?.count || 0);
}

/**
 * Restores an archived article back to active state.
 */
export async function restoreArticle(id: string): Promise<Article | null> {
  const [restored] = await database
    .update(article)
    .set({
      isArchived: false,
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(article.id, id), eq(article.isArchived, true)))
    .returning();

  return restored || null;
}

export interface ArchiveStats {
  totalArticles: number;
  activeArticles: number;
  archivedArticles: number;
  oldestActiveArticle: Date | null;
  oldestArchivedArticle: Date | null;
}

/**
 * Gets statistics about article storage and archiving.
 */
export async function getArchiveStats(): Promise<ArchiveStats> {
  const [totalResult] = await database
    .select({ count: sql<number>`count(*)` })
    .from(article);

  const [activeResult] = await database
    .select({ count: sql<number>`count(*)` })
    .from(article)
    .where(eq(article.isArchived, false));

  const [archivedResult] = await database
    .select({ count: sql<number>`count(*)` })
    .from(article)
    .where(eq(article.isArchived, true));

  const [oldestActive] = await database
    .select({ createdAt: article.createdAt })
    .from(article)
    .where(eq(article.isArchived, false))
    .orderBy(asc(article.createdAt))
    .limit(1);

  const [oldestArchived] = await database
    .select({ archivedAt: article.archivedAt })
    .from(article)
    .where(eq(article.isArchived, true))
    .orderBy(asc(article.archivedAt))
    .limit(1);

  return {
    totalArticles: Number(totalResult?.count || 0),
    activeArticles: Number(activeResult?.count || 0),
    archivedArticles: Number(archivedResult?.count || 0),
    oldestActiveArticle: oldestActive?.createdAt || null,
    oldestArchivedArticle: oldestArchived?.archivedAt || null,
  };
}

export interface FindArticlesForExportOptions {
  topicId: string;
  source?: string;
  sentiment?: ArticleSentiment;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Fetches all articles for a topic for export purposes.
 * Does not apply pagination - returns all matching articles.
 */
export async function findArticlesForExport(
  options: FindArticlesForExportOptions
): Promise<Article[]> {
  const { topicId, source, sentiment, dateFrom, dateTo } = options;

  const conditions = [eq(articleTopic.topicId, topicId), eq(article.isArchived, false)];

  if (source) {
    conditions.push(eq(article.source, source));
  }

  if (sentiment) {
    conditions.push(eq(article.sentiment, sentiment));
  }

  if (dateFrom) {
    conditions.push(gte(article.publishedAt, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(article.publishedAt, dateTo));
  }

  const results = await database
    .select({ article })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(and(...conditions))
    .orderBy(desc(article.publishedAt));

  return results.map((r) => r.article);
}

/**
 * Counts articles for export preview
 */
export async function countArticlesForExport(
  options: FindArticlesForExportOptions
): Promise<number> {
  const { topicId, source, sentiment, dateFrom, dateTo } = options;

  const conditions = [eq(articleTopic.topicId, topicId), eq(article.isArchived, false)];

  if (source) {
    conditions.push(eq(article.source, source));
  }

  if (sentiment) {
    conditions.push(eq(article.sentiment, sentiment));
  }

  if (dateFrom) {
    conditions.push(gte(article.publishedAt, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(article.publishedAt, dateTo));
  }

  const [result] = await database
    .select({ count: sql<number>`count(*)` })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(and(...conditions));

  return Number(result?.count || 0);
}
