import type { Article } from "~/db/schema";

export interface ExportArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  credibilityScore: number | null;
  summary: string | null;
}

export interface ExportMetadata {
  topicName: string;
  topicDescription: string | null;
  exportedAt: string;
  totalArticles: number;
  filters?: {
    source?: string;
    sentiment?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export interface JsonExport {
  metadata: ExportMetadata;
  articles: ExportArticle[];
}

/**
 * Converts an article to the export format
 */
export function articleToExportFormat(article: Article): ExportArticle {
  return {
    id: article.id,
    title: article.title,
    source: article.source,
    url: article.url,
    publishedAt: article.publishedAt?.toISOString() || null,
    sentiment: article.sentiment,
    sentimentScore: article.sentimentScore,
    credibilityScore: article.credibilityScore,
    summary: article.summary,
  };
}

/**
 * Escapes a value for CSV (handles commas, quotes, newlines)
 */
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Converts articles to CSV format
 */
export function articlesToCsv(articles: ExportArticle[]): string {
  const headers = [
    "ID",
    "Title",
    "Source",
    "URL",
    "Published At",
    "Sentiment",
    "Sentiment Score",
    "Credibility Score",
    "Summary",
  ];

  const headerRow = headers.join(",");

  const dataRows = articles.map((article) =>
    [
      escapeCsvValue(article.id),
      escapeCsvValue(article.title),
      escapeCsvValue(article.source),
      escapeCsvValue(article.url),
      escapeCsvValue(article.publishedAt),
      escapeCsvValue(article.sentiment),
      escapeCsvValue(article.sentimentScore),
      escapeCsvValue(article.credibilityScore),
      escapeCsvValue(article.summary),
    ].join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Creates a JSON export with metadata
 */
export function articlesToJson(
  articles: ExportArticle[],
  metadata: Omit<ExportMetadata, "exportedAt" | "totalArticles">
): JsonExport {
  return {
    metadata: {
      ...metadata,
      exportedAt: new Date().toISOString(),
      totalArticles: articles.length,
    },
    articles,
  };
}

/**
 * Triggers a file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename for the export
 */
export function generateExportFilename(
  topicName: string,
  format: "csv" | "json"
): string {
  const sanitizedName = topicName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = new Date().toISOString().split("T")[0];
  return `${sanitizedName}-articles-${date}.${format}`;
}
