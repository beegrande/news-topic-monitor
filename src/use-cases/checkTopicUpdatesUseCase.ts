import {
  findActiveTopicsDueForCheck,
  updateTopicLastChecked,
  updateTopicError,
  type TopicWithUserPlan,
} from "~/data-access/topics";
import {
  createArticleIfNotExists,
  linkArticleToTopic,
} from "~/data-access/articles";
import { getOpenAIApiKey } from "~/data-access/api-keys";
import { getMonitoringIntervalHours, type PlanType } from "~/config/planLimits";
import { generateContentFingerprint } from "~/services/content-fingerprint";
import {
  fetchNewsWithOpenAI,
  OpenAINewsError,
} from "~/services/openai-news";
import { parseLanguageList } from "~/services/language-detection";
import { translateArticleSummary } from "~/services/translation";

export interface CheckTopicUpdatesResult {
  topicsChecked: number;
  articlesFound: number;
  articlesCreated: number;
  errors: string[];
}

export interface FetchedArticle {
  title: string;
  url: string;
  source: string;
  summary?: string;
  publishedAt?: Date;
  language?: string;
  originalLanguage?: string;
  translatedSummary?: string;
}

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
  articles: FetchedArticle[],
  includedSources: string | null | undefined,
  excludedSources: string | null | undefined
): FetchedArticle[] {
  const included = parseSourceList(includedSources);
  const excluded = parseSourceList(excludedSources);

  return articles.filter((article) => {
    const sourceName = article.source.toLowerCase();

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

/**
 * Fetches news using OpenAI web search for the given keywords and languages.
 * Transforms API response to FetchedArticle format.
 */
async function fetchNewsForKeywords(
  apiKey: string,
  keywords: string,
  languages: string[]
): Promise<FetchedArticle[]> {
  try {
    const articles = await fetchNewsWithOpenAI({
      apiKey,
      keywords,
      languages,
      maxArticles: 10,
    });

    const fetchedArticles: FetchedArticle[] = [];

    for (const article of articles) {
      // Translate summary if not in English
      const translatedSummary = await translateArticleSummary(
        article.summary || undefined,
        article.language
      );

      fetchedArticles.push({
        title: article.title,
        url: article.url,
        source: article.source,
        summary: article.summary || undefined,
        publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
        language: article.language,
        originalLanguage: article.language !== "en" ? article.language : undefined,
        translatedSummary: translatedSummary || undefined,
      });
    }

    return fetchedArticles;
  } catch (error) {
    if (error instanceof OpenAINewsError) {
      console.error(`OpenAI news error: ${error.message} (code: ${error.code})`);
      throw error;
    }
    console.error("Unexpected error fetching news:", error);
    throw error;
  }
}

/**
 * Checks if the current time is within a topic's schedule.
 * If scheduling is disabled, returns true (always within schedule).
 *
 * @param topic - The topic with schedule settings
 * @returns true if current time is within schedule or scheduling is disabled
 */
function isWithinSchedule(topic: TopicWithUserPlan): boolean {
  // If scheduling is not enabled, always allow
  if (!topic.scheduleEnabled) {
    return true;
  }

  // Get the current time in the topic's timezone
  const timezone = topic.scheduleTimezone || "UTC";
  const now = new Date();

  // Format current time in the target timezone
  let currentHour: number;
  let currentDay: number;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
      weekday: "short",
    });

    const parts = formatter.formatToParts(now);
    const hourPart = parts.find(p => p.type === "hour");
    const weekdayPart = parts.find(p => p.type === "weekday");

    currentHour = parseInt(hourPart?.value || "0", 10);

    // Convert weekday string to number (0=Sun, 1=Mon, etc.)
    const weekdayMap: Record<string, number> = {
      "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
    };
    currentDay = weekdayMap[weekdayPart?.value || "Sun"] ?? 0;
  } catch {
    // If timezone conversion fails, default to allowing the check
    console.warn(`Invalid timezone "${timezone}" for topic ${topic.id}, allowing check`);
    return true;
  }

  // Check if current day is in the schedule
  if (topic.scheduleDays) {
    const allowedDays = topic.scheduleDays.split(",").map(d => parseInt(d.trim(), 10));
    if (!allowedDays.includes(currentDay)) {
      return false;
    }
  }

  // Check if current hour is within the time window
  const startHour = topic.scheduleStartHour ?? 0;
  const endHour = topic.scheduleEndHour ?? 23;

  // Handle cases where the schedule crosses midnight (e.g., 22:00 to 06:00)
  if (startHour <= endHour) {
    // Normal case: e.g., 9:00 to 17:00
    if (currentHour < startHour || currentHour > endHour) {
      return false;
    }
  } else {
    // Crosses midnight: e.g., 22:00 to 06:00
    if (currentHour < startHour && currentHour > endHour) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a topic is due for update based on its owner's subscription plan.
 */
function isTopicDueForCheck(topic: TopicWithUserPlan): boolean {
  const intervalHours = getMonitoringIntervalHours(topic.userPlan as PlanType);

  if (!topic.lastCheckedAt) {
    return true;
  }

  const cutoffTime = new Date(Date.now() - intervalHours * 60 * 60 * 1000);
  return topic.lastCheckedAt < cutoffTime;
}

/**
 * Processes a single topic: fetches news and stores new articles.
 */
async function processTopicUpdate(
  topic: TopicWithUserPlan,
  apiKey: string
): Promise<{ articlesFound: number; articlesCreated: number }> {
  // Get topic's language preferences (default to English if not set)
  const topicLanguages = parseLanguageList(topic.languages);

  const allArticles = await fetchNewsForKeywords(apiKey, topic.keywords, topicLanguages);

  // Apply source filtering based on topic settings
  const articles = filterArticlesBySource(
    allArticles,
    topic.includedSources,
    topic.excludedSources
  );

  let articlesCreated = 0;

  for (const articleData of articles) {
    // Generate content fingerprint for duplicate detection
    const contentHash = generateContentFingerprint(
      articleData.title,
      articleData.summary
    );

    const { article, created } = await createArticleIfNotExists({
      id: crypto.randomUUID(),
      title: articleData.title,
      url: articleData.url,
      source: articleData.source,
      summary: articleData.summary,
      publishedAt: articleData.publishedAt,
      contentHash,
      // Multi-language fields
      language: articleData.language,
      originalLanguage: articleData.originalLanguage,
      translatedSummary: articleData.translatedSummary,
    });

    // Link the article to the topic
    await linkArticleToTopic(article.id, topic.id);

    if (created) {
      articlesCreated++;
    }
  }

  // Update the topic's lastCheckedAt timestamp
  await updateTopicLastChecked(topic.id);

  return {
    articlesFound: articles.length,
    articlesCreated,
  };
}

/**
 * Main use case: checks all topics due for updates based on subscription tier intervals.
 *
 * This function:
 * 1. Finds all active topics that haven't been checked within their plan's interval
 * 2. For each topic, fetches news matching the topic's keywords using OpenAI
 * 3. Creates new articles and links them to the topic
 * 4. Updates the topic's lastCheckedAt timestamp
 *
 * @param maxIntervalHours - Maximum interval to look back (typically 24 for daily)
 * @returns Summary of processing results
 */
export async function checkTopicUpdatesUseCase(
  maxIntervalHours: number = 24
): Promise<CheckTopicUpdatesResult> {
  const result: CheckTopicUpdatesResult = {
    topicsChecked: 0,
    articlesFound: 0,
    articlesCreated: 0,
    errors: [],
  };

  // Get all topics that might need checking (based on max interval)
  const potentialTopics = await findActiveTopicsDueForCheck(maxIntervalHours);

  // Filter topics based on their individual plan intervals and schedules
  const topicsDueForCheck = potentialTopics
    .filter(isTopicDueForCheck)
    .filter(isWithinSchedule);

  // Group topics by user to efficiently fetch API keys
  const topicsByUser = new Map<string, TopicWithUserPlan[]>();
  for (const topic of topicsDueForCheck) {
    const userTopics = topicsByUser.get(topic.userId) || [];
    userTopics.push(topic);
    topicsByUser.set(topic.userId, userTopics);
  }

  // Process topics for each user
  for (const [userId, userTopics] of topicsByUser) {
    // Get the user's OpenAI API key
    const apiKey = await getOpenAIApiKey(userId);

    if (!apiKey) {
      // User hasn't configured their API key - skip their topics
      for (const topic of userTopics) {
        result.errors.push(`Topic ${topic.id}: User has no OpenAI API key configured`);
        await updateTopicError(topic.id, "OpenAI API key not configured");
      }
      continue;
    }

    // Process each topic for this user
    for (const topic of userTopics) {
      try {
        const { articlesFound, articlesCreated } = await processTopicUpdate(topic, apiKey);
        result.topicsChecked++;
        result.articlesFound += articlesFound;
        result.articlesCreated += articlesCreated;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Topic ${topic.id}: ${errorMessage}`);
        await updateTopicError(topic.id, errorMessage);
      }
    }
  }

  return result;
}
