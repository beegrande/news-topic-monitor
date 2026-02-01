/**
 * Relevance Scoring Service
 *
 * Calculates relevance scores for articles based on multiple signals:
 * 1. Keyword Match (30%) - How well article content matches topic keywords
 * 2. Freshness (15%) - Newer articles score higher
 * 3. Source Authority (15%) - Known reliable sources score higher
 * 4. Sentiment Alignment (10%) - Match user's implicit sentiment preference
 * 5. User Feedback (30%) - Explicit helpful/not helpful votes
 */

import type { Article, Topic } from "~/db/schema";

// Weights for different scoring signals
const WEIGHTS = {
  keywordMatch: 0.3,
  freshness: 0.15,
  sourceAuthority: 0.15,
  sentimentAlignment: 0.1,
  userFeedback: 0.3,
};

// Known authoritative news sources (score 0.8-1.0)
// Less known sources get base score of 0.5
const SOURCE_AUTHORITY: Record<string, number> = {
  "Reuters": 1.0,
  "Associated Press": 1.0,
  "AP News": 1.0,
  "BBC News": 0.95,
  "The New York Times": 0.95,
  "The Washington Post": 0.9,
  "The Guardian": 0.9,
  "Bloomberg": 0.9,
  "Financial Times": 0.9,
  "The Wall Street Journal": 0.9,
  "NPR": 0.85,
  "CNN": 0.8,
  "CNBC": 0.8,
  "Forbes": 0.75,
  "Business Insider": 0.7,
  "TechCrunch": 0.75,
  "The Verge": 0.7,
  "Ars Technica": 0.75,
  "Wired": 0.7,
};

const DEFAULT_SOURCE_AUTHORITY = 0.5;

export interface RelevanceScoreInput {
  article: Article;
  topic: Topic;
  feedbackStats?: {
    helpfulCount: number;
    notHelpfulCount: number;
  };
}

export interface RelevanceScoreResult {
  score: number;
  breakdown: {
    keywordMatch: number;
    freshness: number;
    sourceAuthority: number;
    sentimentAlignment: number;
    userFeedback: number;
  };
}

/**
 * Calculate keyword match score (0-1)
 * Uses simple term frequency matching
 */
function calculateKeywordMatchScore(article: Article, topic: Topic): number {
  const keywords = topic.keywords
    .toLowerCase()
    .split(/[,\s]+/)
    .filter((k) => k.length > 2);

  if (keywords.length === 0) return 0.5;

  const articleText = [
    article.title || "",
    article.summary || "",
    article.content || "",
  ]
    .join(" ")
    .toLowerCase();

  let matchCount = 0;
  let totalWeight = 0;

  for (const keyword of keywords) {
    // Title matches worth more
    const titleMatches = (article.title?.toLowerCase() || "").includes(keyword);
    const summaryMatches = (article.summary?.toLowerCase() || "").includes(keyword);
    const contentMatches = (article.content?.toLowerCase() || "").includes(keyword);

    if (titleMatches) {
      matchCount += 3; // Title matches weighted 3x
    }
    if (summaryMatches) {
      matchCount += 2; // Summary matches weighted 2x
    }
    if (contentMatches) {
      matchCount += 1; // Content matches weighted 1x
    }

    totalWeight += 6; // Max possible per keyword (3+2+1)
  }

  return totalWeight > 0 ? Math.min(1, matchCount / totalWeight) : 0.5;
}

/**
 * Calculate freshness score (0-1)
 * Articles from the last 24 hours get highest score, decays over 7 days
 */
function calculateFreshnessScore(article: Article): number {
  if (!article.publishedAt) return 0.5;

  const now = new Date();
  const publishedAt = new Date(article.publishedAt);
  const ageInHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

  if (ageInHours < 0) return 1; // Future date (unlikely, treat as fresh)
  if (ageInHours <= 24) return 1; // Within 24 hours
  if (ageInHours <= 48) return 0.9; // 1-2 days
  if (ageInHours <= 72) return 0.8; // 2-3 days
  if (ageInHours <= 168) return 0.6; // 3-7 days

  // Older than 7 days, decay gradually
  const daysOld = ageInHours / 24;
  return Math.max(0.2, 1 - daysOld * 0.03); // Min score of 0.2
}

/**
 * Calculate source authority score (0-1)
 * Known authoritative sources score higher
 */
function calculateSourceAuthorityScore(article: Article): number {
  const source = article.source;
  return SOURCE_AUTHORITY[source] ?? DEFAULT_SOURCE_AUTHORITY;
}

/**
 * Calculate sentiment alignment score (0-1)
 * For now, neutral sentiment gets slightly higher score
 * This can be personalized based on user preferences in the future
 */
function calculateSentimentAlignmentScore(article: Article): number {
  // Neutral sentiment is generally preferred for news
  // Strongly positive or negative may indicate bias
  if (!article.sentiment) return 0.5;

  switch (article.sentiment) {
    case "neutral":
      return 0.8;
    case "positive":
      return 0.6;
    case "negative":
      return 0.5;
    default:
      return 0.5;
  }
}

/**
 * Calculate user feedback score (0-1)
 * Based on helpful/not helpful votes from all users
 */
function calculateUserFeedbackScore(
  helpfulCount: number,
  notHelpfulCount: number
): number {
  const totalVotes = helpfulCount + notHelpfulCount;

  if (totalVotes === 0) {
    // No votes yet, return neutral score
    return 0.5;
  }

  // Wilson score interval lower bound for 95% confidence
  // This handles the case where few votes exist more fairly
  const positive = helpfulCount;
  const n = totalVotes;
  const z = 1.96; // 95% confidence

  const phat = positive / n;
  const score =
    (phat +
      (z * z) / (2 * n) -
      z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n);

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate the overall relevance score for an article in a topic context
 */
export function calculateRelevanceScore(
  input: RelevanceScoreInput
): RelevanceScoreResult {
  const { article, topic, feedbackStats } = input;

  const keywordMatch = calculateKeywordMatchScore(article, topic);
  const freshness = calculateFreshnessScore(article);
  const sourceAuthority = calculateSourceAuthorityScore(article);
  const sentimentAlignment = calculateSentimentAlignmentScore(article);
  const userFeedback = calculateUserFeedbackScore(
    feedbackStats?.helpfulCount ?? 0,
    feedbackStats?.notHelpfulCount ?? 0
  );

  // Weighted average
  const score =
    keywordMatch * WEIGHTS.keywordMatch +
    freshness * WEIGHTS.freshness +
    sourceAuthority * WEIGHTS.sourceAuthority +
    sentimentAlignment * WEIGHTS.sentimentAlignment +
    userFeedback * WEIGHTS.userFeedback;

  return {
    score: Math.round(score * 1000) / 1000, // Round to 3 decimal places
    breakdown: {
      keywordMatch,
      freshness,
      sourceAuthority,
      sentimentAlignment,
      userFeedback,
    },
  };
}

/**
 * Calculate initial relevance score for a newly linked article
 * (without user feedback component)
 */
export function calculateInitialRelevanceScore(
  article: Article,
  topic: Topic
): number {
  const result = calculateRelevanceScore({
    article,
    topic,
    feedbackStats: { helpfulCount: 0, notHelpfulCount: 0 },
  });

  return result.score;
}

/**
 * Recalculate relevance score with updated feedback
 */
export function recalculateScoreWithFeedback(
  article: Article,
  topic: Topic,
  helpfulCount: number,
  notHelpfulCount: number
): number {
  const result = calculateRelevanceScore({
    article,
    topic,
    feedbackStats: { helpfulCount, notHelpfulCount },
  });

  return result.score;
}
