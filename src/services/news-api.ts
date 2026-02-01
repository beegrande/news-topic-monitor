import axios from "redaxios";
import { privateEnv } from "~/config/privateEnv";

const NEWS_API_BASE_URL = "https://newsapi.org/v2";

export interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: "ok" | "error";
  totalResults: number;
  articles: NewsApiArticle[];
  code?: string;
  message?: string;
}

export interface FetchNewsOptions {
  query: string;
  pageSize?: number;
  page?: number;
  sortBy?: "relevancy" | "popularity" | "publishedAt";
  from?: string;
  to?: string;
  language?: string;
}

// In-memory cache for API responses
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Rate limiting configuration
interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

const rateLimitState: RateLimitState = {
  requestCount: 0,
  windowStart: Date.now(),
};

// NewsAPI free tier: 100 requests per day, we'll be more conservative
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per hour to stay safe

function getCacheKey(options: FetchNewsOptions): string {
  return JSON.stringify(options);
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

export class NewsApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "NewsApiError";
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function fetchNewsFromApi(
  options: FetchNewsOptions
): Promise<NewsApiArticle[]> {
  // Check cache first
  const cacheKey = getCacheKey(options);
  const cachedResult = getFromCache<NewsApiArticle[]>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Check rate limit
  const rateLimitCheck = checkRateLimit();
  if (!rateLimitCheck.allowed) {
    throw new RateLimitError(
      "Rate limit exceeded. Please try again later.",
      rateLimitCheck.retryAfterMs!
    );
  }

  const {
    query,
    pageSize = 20,
    page = 1,
    sortBy = "publishedAt",
    from,
    to,
    language = "en",
  } = options;

  try {
    incrementRateLimit();

    const response = await axios.get<NewsApiResponse>(
      `${NEWS_API_BASE_URL}/everything`,
      {
        params: {
          q: query,
          pageSize,
          page,
          sortBy,
          from,
          to,
          language,
          apiKey: privateEnv.NEWS_API_KEY,
        },
      }
    );

    if (response.data.status === "error") {
      throw new NewsApiError(
        response.data.message || "Unknown API error",
        response.data.code || "UNKNOWN",
        response.status
      );
    }

    const articles = response.data.articles;

    // Cache the result
    setCache(cacheKey, articles);

    return articles;
  } catch (error) {
    if (error instanceof NewsApiError || error instanceof RateLimitError) {
      throw error;
    }

    // Handle HTTP errors from axios
    const axiosError = error as { status?: number; data?: { message?: string } };
    if (axiosError.status === 429) {
      throw new RateLimitError(
        "NewsAPI rate limit exceeded",
        RATE_LIMIT_WINDOW_MS
      );
    }

    if (axiosError.status === 401) {
      throw new NewsApiError("Invalid API key", "INVALID_API_KEY", 401);
    }

    throw new NewsApiError(
      axiosError.data?.message || "Failed to fetch news",
      "FETCH_ERROR",
      axiosError.status
    );
  }
}

export function clearNewsCache(): void {
  cache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

export function getRateLimitStatus(): {
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
