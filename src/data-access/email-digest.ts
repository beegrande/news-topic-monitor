import { eq, and, sql, gt, or, isNull, lt } from "drizzle-orm";
import { database } from "~/db";
import {
  user,
  topic,
  article,
  articleTopic,
  type User,
  type Topic,
  type Article,
  type EmailDigestFrequency,
} from "~/db/schema";

export interface UserForDigest {
  id: string;
  name: string;
  email: string;
  emailDigestFrequency: EmailDigestFrequency;
  lastDigestSentAt: Date | null;
}

export interface TopicWithArticles {
  topic: Topic;
  articles: Article[];
}

/**
 * Find all users who are due to receive a digest email.
 * Daily users: last digest was more than 24 hours ago (or never sent)
 * Weekly users: last digest was more than 7 days ago (or never sent)
 */
export async function findUsersDueForDigest(): Promise<UserForDigest[]> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const results = await database
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailDigestFrequency: user.emailDigestFrequency,
      lastDigestSentAt: user.lastDigestSentAt,
    })
    .from(user)
    .where(
      or(
        // Daily users due for digest
        and(
          eq(user.emailDigestFrequency, "daily"),
          or(isNull(user.lastDigestSentAt), lt(user.lastDigestSentAt, oneDayAgo))
        ),
        // Weekly users due for digest
        and(
          eq(user.emailDigestFrequency, "weekly"),
          or(isNull(user.lastDigestSentAt), lt(user.lastDigestSentAt, oneWeekAgo))
        )
      )
    );

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    emailDigestFrequency: (row.emailDigestFrequency || "none") as EmailDigestFrequency,
    lastDigestSentAt: row.lastDigestSentAt,
  }));
}

/**
 * Get new articles for a user's topics since their last digest.
 * Returns articles grouped by topic.
 */
export async function getNewArticlesForUser(
  userId: string,
  sinceDate: Date | null
): Promise<TopicWithArticles[]> {
  // Get user's active topics
  const userTopics = await database
    .select()
    .from(topic)
    .where(and(eq(topic.userId, userId), eq(topic.status, "active")));

  if (userTopics.length === 0) {
    return [];
  }

  const results: TopicWithArticles[] = [];

  for (const t of userTopics) {
    // Build conditions for article query
    const conditions = [eq(articleTopic.topicId, t.id)];

    // Only get articles created since last digest
    if (sinceDate) {
      conditions.push(gt(article.createdAt, sinceDate));
    }

    const articles = await database
      .select({ article })
      .from(article)
      .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
      .where(and(...conditions))
      .orderBy(sql`${article.publishedAt} DESC NULLS LAST`)
      .limit(10);

    if (articles.length > 0) {
      results.push({
        topic: t,
        articles: articles.map((r) => r.article),
      });
    }
  }

  return results;
}

/**
 * Update the lastDigestSentAt timestamp for a user.
 */
export async function updateUserLastDigestSent(userId: string): Promise<void> {
  await database
    .update(user)
    .set({
      lastDigestSentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

/**
 * Update a user's email digest frequency preference.
 */
export async function updateUserDigestFrequency(
  userId: string,
  frequency: EmailDigestFrequency
): Promise<User | null> {
  const [updatedUser] = await database
    .update(user)
    .set({
      emailDigestFrequency: frequency,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning();

  return updatedUser || null;
}

/**
 * Get a user's current email digest settings.
 */
export async function getUserDigestSettings(userId: string): Promise<{
  emailDigestFrequency: EmailDigestFrequency;
  lastDigestSentAt: Date | null;
} | null> {
  const [result] = await database
    .select({
      emailDigestFrequency: user.emailDigestFrequency,
      lastDigestSentAt: user.lastDigestSentAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!result) return null;

  return {
    emailDigestFrequency: (result.emailDigestFrequency || "none") as EmailDigestFrequency,
    lastDigestSentAt: result.lastDigestSentAt,
  };
}
