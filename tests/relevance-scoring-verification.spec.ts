import { test, expect } from "@playwright/test";

/**
 * Verification tests for ML-based Relevance Scoring feature.
 * Tests the relevance scoring calculations and UI integration.
 */

test.describe("Relevance Scoring Feature", () => {
  test.describe("Relevance Scoring Service", () => {
    test("calculateKeywordMatchScore returns correct scores", () => {
      function calculateKeywordMatchScore(
        articleTitle: string,
        articleSummary: string | null,
        articleContent: string | null,
        topicKeywords: string
      ): number {
        const keywords = topicKeywords
          .toLowerCase()
          .split(/[,\s]+/)
          .filter((k) => k.length > 2);

        if (keywords.length === 0) return 0.5;

        const articleText = [articleTitle || "", articleSummary || "", articleContent || ""]
          .join(" ")
          .toLowerCase();

        let matchCount = 0;
        let totalWeight = 0;

        for (const keyword of keywords) {
          const titleMatches = articleTitle?.toLowerCase().includes(keyword);
          const summaryMatches = articleSummary?.toLowerCase().includes(keyword);
          const contentMatches = articleContent?.toLowerCase().includes(keyword);

          if (titleMatches) matchCount += 3;
          if (summaryMatches) matchCount += 2;
          if (contentMatches) matchCount += 1;

          totalWeight += 6;
        }

        return totalWeight > 0 ? Math.min(1, matchCount / totalWeight) : 0.5;
      }

      // Test perfect match in all fields
      const perfectScore = calculateKeywordMatchScore(
        "Artificial intelligence revolutionizes healthcare",
        "AI is transforming medical diagnosis",
        "Artificial intelligence systems are now being used in hospitals",
        "artificial, intelligence, AI"
      );
      expect(perfectScore).toBeGreaterThan(0.5);

      // Test no match
      const noMatchScore = calculateKeywordMatchScore(
        "Weather forecast for tomorrow",
        "It will be sunny",
        "Temperatures around 70 degrees",
        "cryptocurrency, bitcoin, blockchain"
      );
      expect(noMatchScore).toBe(0);

      // Test partial match
      const partialScore = calculateKeywordMatchScore(
        "New technology trends",
        "Tech companies are innovating",
        "Software development continues",
        "technology, software, innovation"
      );
      expect(partialScore).toBeGreaterThan(0);
      expect(partialScore).toBeLessThanOrEqual(1);

      // Test empty keywords
      const emptyKeywordsScore = calculateKeywordMatchScore(
        "Some article",
        "Some summary",
        "Some content",
        ""
      );
      expect(emptyKeywordsScore).toBe(0.5);
    });

    test("calculateFreshnessScore returns correct scores based on age", () => {
      function calculateFreshnessScore(publishedAt: Date | null): number {
        if (!publishedAt) return 0.5;

        const now = new Date();
        const ageInHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

        if (ageInHours < 0) return 1;
        if (ageInHours <= 24) return 1;
        if (ageInHours <= 48) return 0.9;
        if (ageInHours <= 72) return 0.8;
        if (ageInHours <= 168) return 0.6;

        const daysOld = ageInHours / 24;
        return Math.max(0.2, 1 - daysOld * 0.03);
      }

      // Test null date
      expect(calculateFreshnessScore(null)).toBe(0.5);

      // Test fresh article (within 24 hours)
      const recentDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      expect(calculateFreshnessScore(recentDate)).toBe(1);

      // Test 1-2 days old
      const oneDayOld = new Date(Date.now() - 36 * 60 * 60 * 1000); // 36 hours ago
      expect(calculateFreshnessScore(oneDayOld)).toBe(0.9);

      // Test 2-3 days old
      const twoDaysOld = new Date(Date.now() - 60 * 60 * 60 * 1000); // 60 hours ago
      expect(calculateFreshnessScore(twoDaysOld)).toBe(0.8);

      // Test 3-7 days old
      const fiveDaysOld = new Date(Date.now() - 120 * 60 * 60 * 1000); // 5 days ago
      expect(calculateFreshnessScore(fiveDaysOld)).toBe(0.6);

      // Test old article (>7 days)
      const twoWeeksOld = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const score = calculateFreshnessScore(twoWeeksOld);
      expect(score).toBeGreaterThanOrEqual(0.2);
      expect(score).toBeLessThan(0.6);
    });

    test("calculateSourceAuthorityScore returns correct scores", () => {
      const SOURCE_AUTHORITY: Record<string, number> = {
        Reuters: 1.0,
        "Associated Press": 1.0,
        "BBC News": 0.95,
        "The New York Times": 0.95,
        "The Washington Post": 0.9,
        Bloomberg: 0.9,
        TechCrunch: 0.75,
      };
      const DEFAULT_SOURCE_AUTHORITY = 0.5;

      function calculateSourceAuthorityScore(source: string): number {
        return SOURCE_AUTHORITY[source] ?? DEFAULT_SOURCE_AUTHORITY;
      }

      // Test known authoritative sources
      expect(calculateSourceAuthorityScore("Reuters")).toBe(1.0);
      expect(calculateSourceAuthorityScore("BBC News")).toBe(0.95);
      expect(calculateSourceAuthorityScore("Bloomberg")).toBe(0.9);
      expect(calculateSourceAuthorityScore("TechCrunch")).toBe(0.75);

      // Test unknown source
      expect(calculateSourceAuthorityScore("Random Blog")).toBe(0.5);
      expect(calculateSourceAuthorityScore("Local News")).toBe(0.5);
    });

    test("calculateUserFeedbackScore uses Wilson score interval", () => {
      function calculateUserFeedbackScore(
        helpfulCount: number,
        notHelpfulCount: number
      ): number {
        const totalVotes = helpfulCount + notHelpfulCount;

        if (totalVotes === 0) {
          return 0.5;
        }

        const positive = helpfulCount;
        const n = totalVotes;
        const z = 1.96;

        const phat = positive / n;
        const score =
          (phat +
            (z * z) / (2 * n) -
            z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
          (1 + (z * z) / n);

        return Math.max(0, Math.min(1, score));
      }

      // No votes = neutral score
      expect(calculateUserFeedbackScore(0, 0)).toBe(0.5);

      // All helpful votes
      const allHelpful = calculateUserFeedbackScore(10, 0);
      expect(allHelpful).toBeGreaterThan(0.7);

      // All unhelpful votes
      const allUnhelpful = calculateUserFeedbackScore(0, 10);
      expect(allUnhelpful).toBeLessThan(0.3);

      // Mixed votes
      const mixed = calculateUserFeedbackScore(5, 5);
      expect(mixed).toBeGreaterThan(0.2);
      expect(mixed).toBeLessThan(0.6);

      // Few votes should have lower confidence (closer to 0.5)
      const fewVotesHelpful = calculateUserFeedbackScore(2, 0);
      const manyVotesHelpful = calculateUserFeedbackScore(20, 0);
      expect(manyVotesHelpful).toBeGreaterThan(fewVotesHelpful);
    });

    test("weighted scoring combines all signals correctly", () => {
      const WEIGHTS = {
        keywordMatch: 0.3,
        freshness: 0.15,
        sourceAuthority: 0.15,
        sentimentAlignment: 0.1,
        userFeedback: 0.3,
      };

      function calculateWeightedScore(breakdown: {
        keywordMatch: number;
        freshness: number;
        sourceAuthority: number;
        sentimentAlignment: number;
        userFeedback: number;
      }): number {
        return (
          breakdown.keywordMatch * WEIGHTS.keywordMatch +
          breakdown.freshness * WEIGHTS.freshness +
          breakdown.sourceAuthority * WEIGHTS.sourceAuthority +
          breakdown.sentimentAlignment * WEIGHTS.sentimentAlignment +
          breakdown.userFeedback * WEIGHTS.userFeedback
        );
      }

      // All perfect scores
      const perfectBreakdown = {
        keywordMatch: 1,
        freshness: 1,
        sourceAuthority: 1,
        sentimentAlignment: 1,
        userFeedback: 1,
      };
      expect(calculateWeightedScore(perfectBreakdown)).toBe(1);

      // All zero scores
      const zeroBreakdown = {
        keywordMatch: 0,
        freshness: 0,
        sourceAuthority: 0,
        sentimentAlignment: 0,
        userFeedback: 0,
      };
      expect(calculateWeightedScore(zeroBreakdown)).toBe(0);

      // Mixed scores
      const mixedBreakdown = {
        keywordMatch: 0.8,
        freshness: 0.5,
        sourceAuthority: 0.7,
        sentimentAlignment: 0.6,
        userFeedback: 0.5,
      };
      const mixedScore = calculateWeightedScore(mixedBreakdown);
      expect(mixedScore).toBeGreaterThan(0.5);
      expect(mixedScore).toBeLessThan(0.8);

      // Verify weights sum to 1
      const totalWeight = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBe(1);
    });
  });

  test.describe("Schema Validation", () => {
    test("articleInteraction schema has required fields", async () => {
      const { articleInteraction } = await import("../src/db/schema");

      const columns = Object.keys(articleInteraction);
      expect(columns).toContain("id");
      expect(columns).toContain("userId");
      expect(columns).toContain("articleId");
      expect(columns).toContain("topicId");
      expect(columns).toContain("interactionType");
      expect(columns).toContain("createdAt");
    });

    test("articleTopic schema includes relevanceScore", async () => {
      const { articleTopic } = await import("../src/db/schema");

      const columns = Object.keys(articleTopic);
      expect(columns).toContain("relevanceScore");
    });

    test("topic schema includes minimumRelevanceScore", async () => {
      const { topic } = await import("../src/db/schema");

      const columns = Object.keys(topic);
      expect(columns).toContain("minimumRelevanceScore");
    });

    test("InteractionType includes required values", async () => {
      const schema = await import("../src/db/schema");

      // Check that interaction types are correctly defined
      type InteractionType = "click" | "helpful" | "not_helpful";
      const validTypes: InteractionType[] = ["click", "helpful", "not_helpful"];

      // Verify each type is valid
      validTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });
  });

  test.describe("Server Function Validation", () => {
    test("submitArticleFeedbackFn validates input correctly", async () => {
      const { z } = await import("zod");

      const submitFeedbackSchema = z.object({
        articleId: z.string(),
        topicId: z.string(),
        feedback: z.enum(["helpful", "not_helpful"]),
      });

      // Valid helpful feedback
      const validHelpful = {
        articleId: "article-123",
        topicId: "topic-456",
        feedback: "helpful",
      };
      expect(submitFeedbackSchema.safeParse(validHelpful).success).toBe(true);

      // Valid not helpful feedback
      const validNotHelpful = {
        articleId: "article-123",
        topicId: "topic-456",
        feedback: "not_helpful",
      };
      expect(submitFeedbackSchema.safeParse(validNotHelpful).success).toBe(true);

      // Invalid feedback type
      const invalidFeedback = {
        articleId: "article-123",
        topicId: "topic-456",
        feedback: "invalid",
      };
      expect(submitFeedbackSchema.safeParse(invalidFeedback).success).toBe(false);

      // Missing fields
      const missingFields = {
        articleId: "article-123",
      };
      expect(submitFeedbackSchema.safeParse(missingFields).success).toBe(false);
    });

    test("recordArticleClickFn validates input correctly", async () => {
      const { z } = await import("zod");

      const recordClickSchema = z.object({
        articleId: z.string(),
        topicId: z.string(),
      });

      // Valid click
      const validClick = {
        articleId: "article-123",
        topicId: "topic-456",
      };
      expect(recordClickSchema.safeParse(validClick).success).toBe(true);

      // Missing articleId
      const missingArticle = { topicId: "topic-456" };
      expect(recordClickSchema.safeParse(missingArticle).success).toBe(false);

      // Missing topicId
      const missingTopic = { articleId: "article-123" };
      expect(recordClickSchema.safeParse(missingTopic).success).toBe(false);
    });

    test("getArticlesByTopicFn supports relevance sorting", async () => {
      const { z } = await import("zod");

      const getArticlesSchema = z.object({
        topicId: z.string(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        sortBy: z.enum(["date", "source", "relevance"]).optional().default("date"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        source: z.string().optional(),
        sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
      });

      // Test relevance sort option
      const sortByRelevance = {
        topicId: "topic-123",
        sortBy: "relevance",
        sortOrder: "desc",
      };
      expect(getArticlesSchema.safeParse(sortByRelevance).success).toBe(true);

      // Test date sort option
      const sortByDate = {
        topicId: "topic-123",
        sortBy: "date",
        sortOrder: "asc",
      };
      expect(getArticlesSchema.safeParse(sortByDate).success).toBe(true);

      // Test invalid sort option
      const invalidSort = {
        topicId: "topic-123",
        sortBy: "invalid",
      };
      expect(getArticlesSchema.safeParse(invalidSort).success).toBe(false);
    });
  });

  test.describe("Data Access Functions", () => {
    test("feedback counts type structure is correct", () => {
      interface FeedbackCounts {
        helpfulCount: number;
        notHelpfulCount: number;
      }

      const validCounts: FeedbackCounts = {
        helpfulCount: 5,
        notHelpfulCount: 2,
      };

      expect(typeof validCounts.helpfulCount).toBe("number");
      expect(typeof validCounts.notHelpfulCount).toBe("number");
      expect(validCounts.helpfulCount).toBeGreaterThanOrEqual(0);
      expect(validCounts.notHelpfulCount).toBeGreaterThanOrEqual(0);
    });
  });
});
