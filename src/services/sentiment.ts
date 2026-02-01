import natural from "natural";
import type { ArticleSentiment } from "~/db/schema";

const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();

// Create the sentiment analyzer with English vocabulary and Porter stemmer
const analyzer = new Analyzer("English", stemmer, "afinn");

export interface SentimentResult {
  sentiment: ArticleSentiment;
  score: number;
}

/**
 * Analyzes the sentiment of text using the AFINN lexicon.
 * Returns a score from -5 to 5 and a classification.
 *
 * @param text - The text to analyze
 * @returns The sentiment classification and score
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return { sentiment: "neutral", score: 0 };
  }

  // Tokenize the text
  const tokens = tokenizer.tokenize(text.toLowerCase());

  if (!tokens || tokens.length === 0) {
    return { sentiment: "neutral", score: 0 };
  }

  // Get sentiment score (returns average sentiment per word)
  const score = analyzer.getSentiment(tokens);

  // Classify based on score thresholds
  // The AFINN lexicon scores words from -5 to 5
  // The analyzer returns the average, so typical range is -1 to 1
  let sentiment: ArticleSentiment;

  if (score > 0.1) {
    sentiment = "positive";
  } else if (score < -0.1) {
    sentiment = "negative";
  } else {
    sentiment = "neutral";
  }

  // Clamp score to -1 to 1 range for database storage
  const normalizedScore = Math.max(-1, Math.min(1, score));

  return {
    sentiment,
    score: Math.round(normalizedScore * 1000) / 1000, // Round to 3 decimal places
  };
}

/**
 * Analyzes sentiment for an article using its title and summary.
 * Weights title slightly higher than summary.
 *
 * @param title - The article title
 * @param summary - The article summary (optional)
 * @returns The sentiment classification and score
 */
export function analyzeArticleSentiment(
  title: string,
  summary?: string | null
): SentimentResult {
  // Combine title and summary, with title having more weight
  const textToAnalyze = summary
    ? `${title} ${title} ${summary}` // Title appears twice for more weight
    : title;

  return analyzeSentiment(textToAnalyze);
}
