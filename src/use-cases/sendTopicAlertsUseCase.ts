import {
  findUsersWithAlertsEnabled,
  findTopicsWithNotificationEnabled,
  findNewArticlesForTopic,
  createNotifications,
  updateUserLastAlertSent,
  type UserForAlerts,
} from "~/data-access/notifications";
import {
  sendTopicAlertEmail,
  type AlertArticle,
  type TopicAlertEmailData,
} from "~/services/email";
import { triggerWebhooksForArticle } from "~/services/webhook-trigger";
import type { Topic, Article, CreateNotificationData } from "~/db/schema";

export interface SendTopicAlertsResult {
  usersProcessed: number;
  alertsSent: number;
  notificationsCreated: number;
  webhooksTriggered: number;
  webhooksFailed: number;
  errors: string[];
}

interface TopicWithNewArticles {
  topic: Topic;
  articles: Article[];
}

/**
 * Gets topics with new articles for a user.
 */
async function getTopicsWithNewArticles(
  userId: string,
  lastAlertSentAt: Date | null
): Promise<TopicWithNewArticles[]> {
  const topics = await findTopicsWithNotificationEnabled(userId);
  const result: TopicWithNewArticles[] = [];

  for (const topic of topics) {
    const articles = await findNewArticlesForTopic(topic.id, lastAlertSentAt);
    if (articles.length > 0) {
      result.push({ topic, articles });
    }
  }

  return result;
}

/**
 * Sends email alert for a topic.
 */
async function sendEmailAlert(
  userEmail: string,
  userName: string,
  topic: Topic,
  articles: Article[]
): Promise<void> {
  const alertArticles: AlertArticle[] = articles.map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source,
    summary: a.summary,
    sentiment: a.sentiment,
  }));

  const emailData: TopicAlertEmailData = {
    userName,
    topicName: topic.name,
    articles: alertArticles,
  };

  await sendTopicAlertEmail(userEmail, emailData);
}

/**
 * Creates in-app notifications for new articles.
 */
async function createInAppNotifications(
  userId: string,
  topicsWithArticles: TopicWithNewArticles[]
): Promise<number> {
  const notificationData: CreateNotificationData[] = [];

  for (const { topic, articles } of topicsWithArticles) {
    for (const article of articles) {
      notificationData.push({
        id: crypto.randomUUID(),
        userId,
        topicId: topic.id,
        articleId: article.id,
        title: `New article for "${topic.name}"`,
        message: article.title,
        type: "new_article",
        isRead: false,
      });
    }
  }

  if (notificationData.length > 0) {
    await createNotifications(notificationData);
  }

  return notificationData.length;
}

/**
 * Trigger webhooks for new articles in a topic.
 */
async function triggerWebhooksForTopic(
  topic: Topic,
  articles: Article[]
): Promise<{ triggered: number; failed: number; errors: string[] }> {
  let triggered = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const article of articles) {
    try {
      const result = await triggerWebhooksForArticle(topic, article);
      triggered += result.triggered;
      failed += result.failed;
      errors.push(...result.errors);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`Article ${article.id}: ${errorMessage}`);
      failed++;
    }
  }

  return { triggered, failed, errors };
}

/**
 * Process alerts for a single user.
 */
async function processUserAlerts(
  user: UserForAlerts,
  lastAlertSentAt: Date | null
): Promise<{
  alertsSent: number;
  notificationsCreated: number;
  webhooksTriggered: number;
  webhooksFailed: number;
  webhookErrors: string[];
}> {
  const topicsWithArticles = await getTopicsWithNewArticles(
    user.id,
    lastAlertSentAt
  );

  if (topicsWithArticles.length === 0) {
    return {
      alertsSent: 0,
      notificationsCreated: 0,
      webhooksTriggered: 0,
      webhooksFailed: 0,
      webhookErrors: [],
    };
  }

  let alertsSent = 0;
  let notificationsCreated = 0;
  let webhooksTriggered = 0;
  let webhooksFailed = 0;
  const webhookErrors: string[] = [];

  const shouldSendEmail =
    user.alertMethod === "email" || user.alertMethod === "both";
  const shouldCreateInApp =
    user.alertMethod === "in_app" || user.alertMethod === "both";

  // Send email alerts (one per topic)
  if (shouldSendEmail) {
    for (const { topic, articles } of topicsWithArticles) {
      await sendEmailAlert(user.email, user.name, topic, articles);
      alertsSent++;
    }
  }

  // Create in-app notifications
  if (shouldCreateInApp) {
    notificationsCreated = await createInAppNotifications(
      user.id,
      topicsWithArticles
    );
  }

  // Trigger webhooks for each topic with new articles
  for (const { topic, articles } of topicsWithArticles) {
    const webhookResult = await triggerWebhooksForTopic(topic, articles);
    webhooksTriggered += webhookResult.triggered;
    webhooksFailed += webhookResult.failed;
    webhookErrors.push(...webhookResult.errors);
  }

  // Update last alert sent timestamp
  await updateUserLastAlertSent(user.id);

  return {
    alertsSent,
    notificationsCreated,
    webhooksTriggered,
    webhooksFailed,
    webhookErrors,
  };
}

/**
 * Main use case: sends topic alerts to users who have new articles.
 *
 * This function:
 * 1. Finds all users with alerts enabled
 * 2. For each user, finds topics with new articles since their last alert
 * 3. Sends email alerts and/or creates in-app notifications based on user preference
 * 4. Triggers configured webhooks for new articles
 * 5. Updates the user's lastAlertSentAt timestamp
 *
 * @returns Summary of processing results
 */
export async function sendTopicAlertsUseCase(): Promise<SendTopicAlertsResult> {
  const result: SendTopicAlertsResult = {
    usersProcessed: 0,
    alertsSent: 0,
    notificationsCreated: 0,
    webhooksTriggered: 0,
    webhooksFailed: 0,
    errors: [],
  };

  // Find all users with alerts enabled
  const users = await findUsersWithAlertsEnabled();

  for (const user of users) {
    try {
      result.usersProcessed++;

      // Use user's lastAlertSentAt, or default to 24 hours ago for new users
      const lastAlertTime = user.lastAlertSentAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

      const {
        alertsSent,
        notificationsCreated,
        webhooksTriggered,
        webhooksFailed,
        webhookErrors,
      } = await processUserAlerts(user, lastAlertTime);

      result.alertsSent += alertsSent;
      result.notificationsCreated += notificationsCreated;
      result.webhooksTriggered += webhooksTriggered;
      result.webhooksFailed += webhooksFailed;
      result.errors.push(...webhookErrors);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(`User ${user.id}: ${errorMessage}`);
    }
  }

  return result;
}
