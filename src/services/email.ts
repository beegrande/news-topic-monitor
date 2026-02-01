import { Resend } from "resend";
import { privateEnv } from "~/config/privateEnv";

export class EmailError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "EmailError";
  }
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Lazy initialization to avoid errors when API key is not set
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = privateEnv.RESEND_API_KEY;
    if (!apiKey) {
      throw new EmailError("RESEND_API_KEY environment variable is not configured", "MISSING_API_KEY");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

const FROM_EMAIL = "News Monitor <noreply@resend.dev>";

export async function sendEmail(options: SendEmailOptions): Promise<{ id: string }> {
  const { to, subject, html } = options;

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      throw new EmailError(error.message, error.name);
    }

    if (!data) {
      throw new EmailError("No response from email service");
    }

    return { id: data.id };
  } catch (error) {
    if (error instanceof EmailError) {
      throw error;
    }

    throw new EmailError(
      error instanceof Error ? error.message : "Failed to send email"
    );
  }
}

export interface DigestArticle {
  title: string;
  url: string;
  source: string;
  summary?: string | null;
  sentiment?: string | null;
  publishedAt?: Date | null;
}

export interface DigestTopic {
  name: string;
  articles: DigestArticle[];
}

export interface DigestEmailData {
  userName: string;
  topics: DigestTopic[];
  periodLabel: string;
}

export function generateDigestEmailHtml(data: DigestEmailData): string {
  const { userName, topics, periodLabel } = data;

  const totalArticles = topics.reduce((sum, t) => sum + t.articles.length, 0);

  const topicSections = topics
    .filter((t) => t.articles.length > 0)
    .map((topic) => {
      const articleRows = topic.articles
        .slice(0, 5)
        .map((article) => {
          const sentimentBadge = article.sentiment
            ? `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;background:${
                article.sentiment === "positive"
                  ? "#dcfce7"
                  : article.sentiment === "negative"
                    ? "#fee2e2"
                    : "#f3f4f6"
              };color:${
                article.sentiment === "positive"
                  ? "#166534"
                  : article.sentiment === "negative"
                    ? "#991b1b"
                    : "#374151"
              };">${article.sentiment}</span>`
            : "";

          return `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
              <a href="${article.url}" style="color:#2563eb;text-decoration:none;font-weight:500;">${article.title}</a>
              <div style="margin-top:4px;font-size:13px;color:#6b7280;">
                ${article.source} ${sentimentBadge}
              </div>
              ${article.summary ? `<div style="margin-top:6px;font-size:14px;color:#374151;">${article.summary.slice(0, 150)}${article.summary.length > 150 ? "..." : ""}</div>` : ""}
            </td>
          </tr>
        `;
        })
        .join("");

      const moreCount = topic.articles.length - 5;

      return `
        <div style="margin-bottom:32px;">
          <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">${topic.name} <span style="font-weight:normal;color:#6b7280;">(${topic.articles.length} articles)</span></h2>
          <table style="width:100%;border-collapse:collapse;">
            ${articleRows}
          </table>
          ${moreCount > 0 ? `<p style="margin-top:12px;font-size:14px;color:#6b7280;">And ${moreCount} more articles...</p>` : ""}
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your ${periodLabel} News Digest</title>
      </head>
      <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background:#f9fafb;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:#ffffff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">Your ${periodLabel} News Digest</h1>
            <p style="margin:0 0 24px;color:#6b7280;">Hi ${userName}, here's a summary of ${totalArticles} new articles across your monitored topics.</p>

            ${topicSections || '<p style="color:#6b7280;">No new articles in this period.</p>'}

            <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:13px;color:#9ca3af;">
              You're receiving this email because you enabled ${periodLabel.toLowerCase()} digests.
              <a href="${process.env.VITE_BETTER_AUTH_URL || "http://localhost:3000"}/settings" style="color:#2563eb;">Manage your preferences</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendDigestEmail(
  to: string,
  data: DigestEmailData
): Promise<{ id: string }> {
  const html = generateDigestEmailHtml(data);

  return sendEmail({
    to,
    subject: `Your ${data.periodLabel} News Digest - ${data.topics.reduce((sum, t) => sum + t.articles.length, 0)} new articles`,
    html,
  });
}

export interface AlertArticle {
  title: string;
  url: string;
  source: string;
  summary?: string | null;
  sentiment?: string | null;
}

export interface TopicAlertEmailData {
  userName: string;
  topicName: string;
  articles: AlertArticle[];
}

export function generateTopicAlertEmailHtml(data: TopicAlertEmailData): string {
  const { userName, topicName, articles } = data;

  const articleRows = articles
    .slice(0, 5)
    .map((article) => {
      const sentimentBadge = article.sentiment
        ? `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;background:${
            article.sentiment === "positive"
              ? "#dcfce7"
              : article.sentiment === "negative"
                ? "#fee2e2"
                : "#f3f4f6"
          };color:${
            article.sentiment === "positive"
              ? "#166534"
              : article.sentiment === "negative"
                ? "#991b1b"
                : "#374151"
          };">${article.sentiment}</span>`
        : "";

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <a href="${article.url}" style="color:#2563eb;text-decoration:none;font-weight:500;">${article.title}</a>
            <div style="margin-top:4px;font-size:13px;color:#6b7280;">
              ${article.source} ${sentimentBadge}
            </div>
            ${article.summary ? `<div style="margin-top:6px;font-size:14px;color:#374151;">${article.summary.slice(0, 150)}${article.summary.length > 150 ? "..." : ""}</div>` : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  const moreCount = articles.length - 5;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Articles for ${topicName}</title>
      </head>
      <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background:#f9fafb;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:#ffffff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="display:inline-block;padding:4px 12px;background:#dbeafe;color:#1e40af;border-radius:16px;font-size:12px;font-weight:500;margin-bottom:16px;">
              New Articles Alert
            </div>
            <h1 style="margin:0 0 8px;font-size:24px;color:#111827;">${topicName}</h1>
            <p style="margin:0 0 24px;color:#6b7280;">Hi ${userName}, we found ${articles.length} new article${articles.length !== 1 ? "s" : ""} matching your topic.</p>

            <table style="width:100%;border-collapse:collapse;">
              ${articleRows}
            </table>
            ${moreCount > 0 ? `<p style="margin-top:12px;font-size:14px;color:#6b7280;">And ${moreCount} more articles...</p>` : ""}

            <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:13px;color:#9ca3af;">
              You're receiving this email because you enabled alerts for this topic.
              <a href="${process.env.VITE_BETTER_AUTH_URL || "http://localhost:3000"}/settings" style="color:#2563eb;">Manage your preferences</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendTopicAlertEmail(
  to: string,
  data: TopicAlertEmailData
): Promise<{ id: string }> {
  const html = generateTopicAlertEmailHtml(data);

  return sendEmail({
    to,
    subject: `${data.articles.length} new article${data.articles.length !== 1 ? "s" : ""} for "${data.topicName}"`,
    html,
  });
}
