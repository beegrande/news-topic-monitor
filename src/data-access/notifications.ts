import { eq, and, desc, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  notification,
  user,
  topic,
  article,
  articleTopic,
  type Notification,
  type CreateNotificationData,
  type User,
  type Topic,
  type Article,
} from "~/db/schema";

export interface NotificationWithDetails extends Notification {
  topic?: Topic | null;
  article?: Article | null;
}

/**
 * Create a new notification
 */
export async function createNotification(
  data: CreateNotificationData
): Promise<Notification> {
  const [newNotification] = await database
    .insert(notification)
    .values(data)
    .returning();

  return newNotification;
}

/**
 * Create multiple notifications at once
 */
export async function createNotifications(
  data: CreateNotificationData[]
): Promise<Notification[]> {
  if (data.length === 0) return [];

  const notifications = await database
    .insert(notification)
    .values(data)
    .returning();

  return notifications;
}

/**
 * Get notifications for a user
 */
export async function findNotificationsByUserId(
  userId: string,
  limit = 50,
  offset = 0
): Promise<NotificationWithDetails[]> {
  const results = await database
    .select({
      notification: notification,
      topic: topic,
      article: article,
    })
    .from(notification)
    .leftJoin(topic, eq(notification.topicId, topic.id))
    .leftJoin(article, eq(notification.articleId, article.id))
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r.notification,
    topic: r.topic,
    article: r.article,
  }));
}

/**
 * Get unread notification count for a user
 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(notification)
    .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));

  return result?.count ?? 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  const [updated] = await database
    .update(notification)
    .set({ isRead: true })
    .where(
      and(eq(notification.id, notificationId), eq(notification.userId, userId))
    )
    .returning();

  return updated || null;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await database
    .update(notification)
    .set({ isRead: true })
    .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));

  return result.rowCount ?? 0;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const result = await database
    .delete(notification)
    .where(
      and(eq(notification.id, notificationId), eq(notification.userId, userId))
    );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<number> {
  const result = await database
    .delete(notification)
    .where(eq(notification.userId, userId));

  return result.rowCount ?? 0;
}

/**
 * Get user's alert settings
 */
export async function getUserAlertSettings(userId: string): Promise<{
  alertsEnabled: boolean;
  alertMethod: string;
  lastAlertSentAt: Date | null;
} | null> {
  const [result] = await database
    .select({
      alertsEnabled: user.alertsEnabled,
      alertMethod: user.alertMethod,
      lastAlertSentAt: user.lastAlertSentAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result || null;
}

/**
 * Update user's alert settings
 */
export async function updateUserAlertSettings(
  userId: string,
  settings: {
    alertsEnabled?: boolean;
    alertMethod?: string;
  }
): Promise<User | null> {
  const [updated] = await database
    .update(user)
    .set({
      ...settings,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning();

  return updated || null;
}

/**
 * Update user's last alert sent timestamp
 */
export async function updateUserLastAlertSent(userId: string): Promise<void> {
  await database
    .update(user)
    .set({
      lastAlertSentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

export interface UserForAlerts {
  id: string;
  name: string;
  email: string;
  alertsEnabled: boolean;
  alertMethod: string;
  lastAlertSentAt: Date | null;
}

export interface TopicWithNewArticles {
  topic: Topic;
  articles: Article[];
}

/**
 * Find users who have alerts enabled for a specific topic
 */
export async function findUsersWithAlertsEnabled(): Promise<UserForAlerts[]> {
  const results = await database
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      alertsEnabled: user.alertsEnabled,
      alertMethod: user.alertMethod,
      lastAlertSentAt: user.lastAlertSentAt,
    })
    .from(user)
    .where(eq(user.alertsEnabled, true));

  return results;
}

/**
 * Find topics with notification enabled for a user
 */
export async function findTopicsWithNotificationEnabled(
  userId: string
): Promise<Topic[]> {
  const results = await database
    .select()
    .from(topic)
    .where(
      and(
        eq(topic.userId, userId),
        eq(topic.status, "active"),
        eq(topic.notificationEnabled, true)
      )
    );

  return results;
}

/**
 * Find new articles for a topic since a given date
 */
export async function findNewArticlesForTopic(
  topicId: string,
  sinceDate: Date | null
): Promise<Article[]> {
  const query = database
    .select({ article: article })
    .from(article)
    .innerJoin(articleTopic, eq(article.id, articleTopic.articleId))
    .where(eq(articleTopic.topicId, topicId))
    .orderBy(desc(article.createdAt))
    .limit(10);

  const results = await query;

  if (sinceDate) {
    return results
      .map((r) => r.article)
      .filter((a) => a.createdAt > sinceDate);
  }

  return results.map((r) => r.article);
}
