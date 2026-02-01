import natural from "natural";
import type { Article } from "~/db/schema";

const TfIdf = natural.TfIdf;

export interface ArticleCluster {
  id: string;
  name: string;
  articles: Article[];
  representativeArticle: Article;
}

interface ArticleWithText {
  article: Article;
  text: string;
}

/**
 * Extracts text content from an article for clustering.
 * Combines title and summary/content for better similarity matching.
 */
function getArticleText(article: Article): string {
  const parts = [article.title];
  if (article.summary) {
    parts.push(article.summary);
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Calculates cosine similarity between two TF-IDF vectors.
 */
function cosineSimilarity(
  tfidf: natural.TfIdf,
  docIndex1: number,
  docIndex2: number
): number {
  const terms = new Set<string>();

  // Collect all terms from both documents
  tfidf.listTerms(docIndex1).forEach((item) => terms.add(item.term));
  tfidf.listTerms(docIndex2).forEach((item) => terms.add(item.term));

  if (terms.size === 0) return 0;

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (const term of terms) {
    const tfidf1 = tfidf.tfidf(term, docIndex1);
    const tfidf2 = tfidf.tfidf(term, docIndex2);

    dotProduct += tfidf1 * tfidf2;
    magnitude1 += tfidf1 * tfidf1;
    magnitude2 += tfidf2 * tfidf2;
  }

  const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Generates a cluster name from the most important terms in the representative article.
 */
function generateClusterName(
  tfidf: natural.TfIdf,
  docIndex: number,
  article: Article
): string {
  // Get top 3 terms by TF-IDF weight
  const terms = tfidf.listTerms(docIndex);
  const topTerms = terms.slice(0, 3).map((t) => t.term);

  if (topTerms.length > 0) {
    // Capitalize first letter of each term
    return topTerms.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ");
  }

  // Fallback to truncated title
  return article.title.length > 50
    ? article.title.substring(0, 47) + "..."
    : article.title;
}

/**
 * Clusters articles using TF-IDF similarity with greedy clustering.
 * Articles with similarity above the threshold are grouped together.
 *
 * @param articles - Array of articles to cluster
 * @param similarityThreshold - Minimum similarity (0-1) to group articles (default: 0.3)
 * @returns Array of article clusters
 */
export function clusterArticles(
  articles: Article[],
  similarityThreshold: number = 0.3
): ArticleCluster[] {
  if (articles.length === 0) {
    return [];
  }

  if (articles.length === 1) {
    return [
      {
        id: `cluster-${articles[0].id}`,
        name: articles[0].title,
        articles: [articles[0]],
        representativeArticle: articles[0],
      },
    ];
  }

  // Build TF-IDF model
  const tfidf = new TfIdf();
  const articlesWithText: ArticleWithText[] = articles.map((article) => ({
    article,
    text: getArticleText(article),
  }));

  // Add all documents to TF-IDF
  articlesWithText.forEach((item) => {
    tfidf.addDocument(item.text);
  });

  // Track which articles have been assigned to clusters
  const assigned = new Set<number>();
  const clusters: ArticleCluster[] = [];

  // Greedy clustering: for each unassigned article, find similar ones
  for (let i = 0; i < articles.length; i++) {
    if (assigned.has(i)) continue;

    const clusterArticles: Article[] = [articles[i]];
    assigned.add(i);

    // Find all similar articles
    for (let j = i + 1; j < articles.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = cosineSimilarity(tfidf, i, j);
      if (similarity >= similarityThreshold) {
        clusterArticles.push(articles[j]);
        assigned.add(j);
      }
    }

    // The first article (earliest in the list, typically most recent or highest relevance)
    // becomes the representative article
    const representativeArticle = clusterArticles[0];
    const clusterName = generateClusterName(tfidf, i, representativeArticle);

    clusters.push({
      id: `cluster-${representativeArticle.id}`,
      name: clusterName,
      articles: clusterArticles,
      representativeArticle,
    });
  }

  // Sort clusters by size (largest first), then by representative article date
  clusters.sort((a, b) => {
    if (b.articles.length !== a.articles.length) {
      return b.articles.length - a.articles.length;
    }
    // If same size, sort by most recent representative article
    const dateA = a.representativeArticle.publishedAt?.getTime() || 0;
    const dateB = b.representativeArticle.publishedAt?.getTime() || 0;
    return dateB - dateA;
  });

  return clusters;
}

/**
 * Groups articles into clusters and returns them with cluster metadata.
 * This is a simpler wrapper for use in server functions.
 */
export function getClusteredArticles(
  articles: Article[],
  options?: {
    similarityThreshold?: number;
  }
): ArticleCluster[] {
  return clusterArticles(articles, options?.similarityThreshold);
}
