import {
  findUsersDueForDigest,
  getNewArticlesForUser,
  updateUserLastDigestSent,
  type UserForDigest,
} from "~/data-access/email-digest";
import {
  sendDigestEmail,
  type DigestTopic,
  type DigestEmailData,
} from "~/services/email";

export interface SendEmailDigestsResult {
  usersProcessed: number;
  emailsSent: number;
  errors: string[];
}

/**
 * Process a single user's digest email.
 */
async function processUserDigest(userDigest: UserForDigest): Promise<boolean> {
  // Get new articles since last digest
  const topicsWithArticles = await getNewArticlesForUser(
    userDigest.id,
    userDigest.lastDigestSentAt
  );

  // Skip if no new articles
  const totalArticles = topicsWithArticles.reduce(
    (sum, t) => sum + t.articles.length,
    0
  );

  if (totalArticles === 0) {
    // Still update the timestamp so we don't check again too soon
    await updateUserLastDigestSent(userDigest.id);
    return false;
  }

  // Build digest data
  const digestTopics: DigestTopic[] = topicsWithArticles.map((ta) => ({
    name: ta.topic.name,
    articles: ta.articles.map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source,
      summary: a.summary,
      sentiment: a.sentiment,
      publishedAt: a.publishedAt,
    })),
  }));

  const periodLabel =
    userDigest.emailDigestFrequency === "daily" ? "Daily" : "Weekly";

  const emailData: DigestEmailData = {
    userName: userDigest.name,
    topics: digestTopics,
    periodLabel,
  };

  // Send the email
  await sendDigestEmail(userDigest.email, emailData);

  // Update the user's lastDigestSentAt
  await updateUserLastDigestSent(userDigest.id);

  return true;
}

/**
 * Main use case: sends email digests to all users who are due.
 *
 * This function:
 * 1. Finds all users with digest enabled who are due for their next email
 * 2. For each user, gathers new articles from their active topics
 * 3. Generates and sends a personalized digest email
 * 4. Updates the lastDigestSentAt timestamp
 *
 * @returns Summary of processing results
 */
export async function sendEmailDigestsUseCase(): Promise<SendEmailDigestsResult> {
  const result: SendEmailDigestsResult = {
    usersProcessed: 0,
    emailsSent: 0,
    errors: [],
  };

  // Find all users due for digest
  const usersDue = await findUsersDueForDigest();

  for (const userDigest of usersDue) {
    try {
      result.usersProcessed++;
      const emailSent = await processUserDigest(userDigest);
      if (emailSent) {
        result.emailsSent++;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(`User ${userDigest.id}: ${errorMessage}`);
    }
  }

  return result;
}
