import { createFileRoute } from "@tanstack/react-router";
import { findTopicById } from "~/data-access/topics";
import { findArticlesByTopicId } from "~/data-access/articles";

function escapeXml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRfc822Date(date: Date | null | undefined): string {
  if (!date) return new Date().toUTCString();
  return date.toUTCString();
}

export const Route = createFileRoute("/api/feeds/topic/$id/rss")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const topicId = params.id;
        const url = new URL(request.url);
        const token = url.searchParams.get("token");

        // Validate token parameter exists
        if (!token) {
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
<error>Missing feed token. Add ?token=YOUR_FEED_TOKEN to the URL.</error>`,
            {
              status: 401,
              headers: { "Content-Type": "application/xml" },
            }
          );
        }

        try {
          // Find the topic
          const topic = await findTopicById(topicId);

          if (!topic) {
            return new Response(
              `<?xml version="1.0" encoding="UTF-8"?>
<error>Topic not found.</error>`,
              {
                status: 404,
                headers: { "Content-Type": "application/xml" },
              }
            );
          }

          // Validate feed token
          if (!topic.feedToken || topic.feedToken !== token) {
            return new Response(
              `<?xml version="1.0" encoding="UTF-8"?>
<error>Invalid feed token.</error>`,
              {
                status: 403,
                headers: { "Content-Type": "application/xml" },
              }
            );
          }

          // Fetch recent articles for this topic (limit to 50 for RSS)
          const articles = await findArticlesByTopicId(topicId, 50);

          // Build RSS XML
          const baseUrl = url.origin;
          const feedUrl = `${baseUrl}/api/feeds/topic/${topicId}/rss?token=${token}`;
          const topicUrl = `${baseUrl}/topic/${topicId}/articles`;

          const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(topic.name)}</title>
    <link>${escapeXml(topicUrl)}</link>
    <description>${escapeXml(topic.description || `News articles for topic: ${topic.name}`)}</description>
    <language>en</language>
    <lastBuildDate>${formatRfc822Date(new Date())}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <generator>News Topic Monitor</generator>
${articles
  .map(
    (article) => `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(article.url)}</link>
      <description>${escapeXml(article.summary || article.content?.substring(0, 500) || "")}</description>
      <pubDate>${formatRfc822Date(article.publishedAt)}</pubDate>
      <guid isPermaLink="true">${escapeXml(article.url)}</guid>
      <source url="${escapeXml(article.url)}">${escapeXml(article.source)}</source>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>`;

          return new Response(rss, {
            status: 200,
            headers: {
              "Content-Type": "application/rss+xml; charset=utf-8",
              "Cache-Control": "public, max-age=300", // Cache for 5 minutes
            },
          });
        } catch (error) {
          console.error("RSS feed generation failed:", error);
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
<error>Failed to generate RSS feed.</error>`,
            {
              status: 500,
              headers: { "Content-Type": "application/xml" },
            }
          );
        }
      },
    },
  },
});
