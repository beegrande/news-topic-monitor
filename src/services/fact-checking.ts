import axios from "redaxios";
import { privateEnv } from "~/config/privateEnv";
import type { FactCheckStatus } from "~/db/schema";

const FACT_CHECK_API_BASE_URL =
  "https://factchecktools.googleapis.com/v1alpha1/claims:search";

// In-memory cache for API responses
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours - fact-checks don't change often

// Rate limiting configuration
interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

const rateLimitState: RateLimitState = {
  requestCount: 0,
  windowStart: Date.now(),
};

// Google Fact Check API has generous limits, but we'll be conservative
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 50; // Max 50 requests per hour

// Known reliable fact-checking sources with quality ratings
const SOURCE_QUALITY_RATINGS: Record<string, number> = {
  "snopes.com": 95,
  "politifact.com": 95,
  "factcheck.org": 95,
  "apnews.com": 90,
  "reuters.com": 90,
  "bbc.com": 85,
  "washingtonpost.com": 85,
  "nytimes.com": 85,
  "fullfact.org": 90,
  "leadstories.com": 85,
  "usatoday.com": 80,
  "afp.com": 85,
};

export interface FactCheckClaim {
  text: string;
  claimant?: string;
  claimDate?: string;
  claimReview: {
    publisher: {
      name: string;
      site?: string;
    };
    url: string;
    title: string;
    reviewDate?: string;
    textualRating: string;
    languageCode?: string;
  }[];
}

export interface FactCheckResult {
  status: FactCheckStatus;
  credibilityScore: number; // 0-100
  claims: FactCheckClaim[];
  checkedAt: Date;
}

export class FactCheckApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "FactCheckApiError";
  }
}

export class FactCheckRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs: number
  ) {
    super(message);
    this.name = "FactCheckRateLimitError";
  }
}

function getCacheKey(query: string): string {
  return `factcheck:${query.toLowerCase().trim()}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function checkRateLimit(): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();

  // Reset window if expired
  if (now - rateLimitState.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = now;
  }

  if (rateLimitState.requestCount >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterMs =
      RATE_LIMIT_WINDOW_MS - (now - rateLimitState.windowStart);
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true };
}

function incrementRateLimit(): void {
  rateLimitState.requestCount++;
}

/**
 * Extracts key claims or phrases from article title for fact-checking.
 * Focuses on factual statements rather than opinions.
 */
function extractSearchQuery(title: string, summary?: string | null): string {
  // Combine title with beginning of summary for more context
  let query = title;
  if (summary) {
    // Take first 100 chars of summary to add context
    const summarySnippet = summary.slice(0, 100).split(" ").slice(0, -1).join(" ");
    query = `${title} ${summarySnippet}`;
  }

  // Clean up the query
  return query
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .slice(0, 200); // API has query length limits
}

/**
 * Calculates credibility score based on fact-check claims.
 * Returns 0-100 where:
 * - 100 = No fact-check claims found (neutral/unverified)
 * - 80-99 = Positive fact-checks (verified true)
 * - 50-79 = Mixed results
 * - 20-49 = Some concerns flagged
 * - 0-19 = Multiple false claims detected
 */
function calculateCredibilityScore(claims: FactCheckClaim[]): number {
  if (claims.length === 0) {
    // No claims found - return neutral score
    return 75;
  }

  let totalScore = 0;
  let totalWeight = 0;

  for (const claim of claims) {
    for (const review of claim.claimReview) {
      const rating = review.textualRating.toLowerCase();
      let ratingScore: number;

      // Map textual ratings to scores
      if (
        rating.includes("true") &&
        !rating.includes("false") &&
        !rating.includes("partly") &&
        !rating.includes("mostly")
      ) {
        ratingScore = 100;
      } else if (rating.includes("mostly true") || rating.includes("mostly accurate")) {
        ratingScore = 85;
      } else if (
        rating.includes("half true") ||
        rating.includes("mixture") ||
        rating.includes("partly") ||
        rating.includes("mixed")
      ) {
        ratingScore = 50;
      } else if (rating.includes("mostly false") || rating.includes("misleading")) {
        ratingScore = 25;
      } else if (
        rating.includes("false") ||
        rating.includes("pants on fire") ||
        rating.includes("fake")
      ) {
        ratingScore = 5;
      } else {
        // Unknown rating - neutral
        ratingScore = 60;
      }

      // Weight by source quality
      const sourceSite = review.publisher.site || "";
      const domain = sourceSite.replace(/^www\./, "").toLowerCase();
      const sourceWeight = SOURCE_QUALITY_RATINGS[domain] || 70;

      totalScore += ratingScore * sourceWeight;
      totalWeight += sourceWeight;
    }
  }

  if (totalWeight === 0) {
    return 75; // No weighted reviews found
  }

  return Math.round(totalScore / totalWeight);
}

/**
 * Searches for fact-checks related to an article.
 */
export async function searchFactChecks(
  query: string
): Promise<FactCheckClaim[]> {
  const apiKey = privateEnv.GOOGLE_FACT_CHECK_API_KEY;

  if (!apiKey) {
    // If no API key configured, return empty results
    return [];
  }

  // Check cache first
  const cacheKey = getCacheKey(query);
  const cachedResult = getFromCache<FactCheckClaim[]>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Check rate limit
  const rateLimitCheck = checkRateLimit();
  if (!rateLimitCheck.allowed) {
    throw new FactCheckRateLimitError(
      "Rate limit exceeded. Please try again later.",
      rateLimitCheck.retryAfterMs!
    );
  }

  try {
    incrementRateLimit();

    const response = await axios.get(FACT_CHECK_API_BASE_URL, {
      params: {
        key: apiKey,
        query,
        languageCode: "en",
        pageSize: 10,
      },
    });

    const claims: FactCheckClaim[] = response.data.claims || [];

    // Cache the result
    setCache(cacheKey, claims);

    return claims;
  } catch (error) {
    const axiosError = error as { status?: number; data?: { error?: { message?: string } } };

    if (axiosError.status === 429) {
      throw new FactCheckRateLimitError(
        "Google Fact Check API rate limit exceeded",
        RATE_LIMIT_WINDOW_MS
      );
    }

    if (axiosError.status === 401 || axiosError.status === 403) {
      throw new FactCheckApiError("Invalid API key", "INVALID_API_KEY", axiosError.status);
    }

    // For other errors, return empty results rather than failing
    console.error("Fact-check API error:", axiosError.data?.error?.message || error);
    return [];
  }
}

/**
 * Performs fact-checking on an article based on its title and summary.
 * Returns the credibility score and any related fact-check claims.
 */
export async function checkArticleCredibility(
  title: string,
  summary?: string | null
): Promise<FactCheckResult> {
  try {
    const query = extractSearchQuery(title, summary);
    const claims = await searchFactChecks(query);
    const credibilityScore = calculateCredibilityScore(claims);

    return {
      status: "checked",
      credibilityScore,
      claims,
      checkedAt: new Date(),
    };
  } catch (error) {
    if (error instanceof FactCheckRateLimitError) {
      throw error;
    }

    // Return failed status for other errors
    return {
      status: "failed",
      credibilityScore: 75, // Neutral score on failure
      claims: [],
      checkedAt: new Date(),
    };
  }
}

/**
 * Gets the display label for a credibility score.
 */
export function getCredibilityLabel(score: number): string {
  if (score >= 80) return "Verified";
  if (score >= 60) return "Likely Accurate";
  if (score >= 40) return "Mixed";
  if (score >= 20) return "Questionable";
  return "Disputed";
}

/**
 * Gets the display color class for a credibility score.
 */
export function getCredibilityColor(score: number): string {
  if (score >= 80) return "green";
  if (score >= 60) return "blue";
  if (score >= 40) return "yellow";
  if (score >= 20) return "orange";
  return "red";
}

export function clearFactCheckCache(): void {
  cache.clear();
}

export function getFactCheckRateLimitStatus(): {
  requestCount: number;
  maxRequests: number;
  windowResetMs: number;
} {
  const now = Date.now();
  const windowResetMs = Math.max(
    0,
    RATE_LIMIT_WINDOW_MS - (now - rateLimitState.windowStart)
  );

  return {
    requestCount: rateLimitState.requestCount,
    maxRequests: MAX_REQUESTS_PER_WINDOW,
    windowResetMs,
  };
}
