import { createFileRoute } from "@tanstack/react-router";
import { findCollectionByIdWithTopics } from "~/data-access/collections";
import { findArticlesByTopicId } from "~/data-access/articles";
import type { Article } from "~/db/schema";

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

export const Route = createFileRoute("/api/feeds/collection/$id/rss")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const collectionId = params.id;
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
          // Find the collection with its topics
          const collection = await findCollectionByIdWithTopics(collectionId);

          if (!collection) {
            return new Response(
              `<?xml version="1.0" encoding="UTF-8"?>
<error>Collection not found.</error>`,
              {
                status: 404,
                headers: { "Content-Type": "application/xml" },
              }
            );
          }

          // Validate feed token
          if (!collection.feedToken || collection.feedToken !== token) {
            return new Response(
              `<?xml version="1.0" encoding="UTF-8"?>
<error>Invalid feed token.</error>`,
              {
                status: 403,
                headers: { "Content-Type": "application/xml" },
              }
            );
          }

          // Fetch articles from all topics in the collection
          const articlesPerTopic = 20; // Limit per topic to prevent huge feeds
          const articlePromises = collection.topics.map((topic) =>
            findArticlesByTopicId(topic.id, articlesPerTopic)
          );
          const articleArrays = await Promise.all(articlePromises);

          // Flatten and deduplicate articles by URL, then sort by date
          const articleMap = new Map<string, Article>();
          for (const articles of articleArrays) {
            for (const article of articles) {
              if (!articleMap.has(article.url)) {
                articleMap.set(article.url, article);
              }
            }
          }

          const articles = Array.from(articleMap.values())
            .sort((a, b) => {
              const dateA = a.publishedAt?.getTime() || 0;
              const dateB = b.publishedAt?.getTime() || 0;
              return dateB - dateA;
            })
            .slice(0, 50); // Limit total to 50 articles

          // Build RSS XML
          const baseUrl = url.origin;
          const feedUrl = `${baseUrl}/api/feeds/collection/${collectionId}/rss?token=${token}`;
          const collectionUrl = `${baseUrl}/collections/${collectionId}`;

          const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(collection.name)}</title>
    <link>${escapeXml(collectionUrl)}</link>
    <description>${escapeXml(collection.description || `News articles from collection: ${collection.name}`)}</description>
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
