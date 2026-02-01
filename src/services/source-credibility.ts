/**
 * Source Credibility Scoring Service
 *
 * This service handles the calculation and management of source credibility scores.
 * Scores are based on:
 * - User feedback ratings (40% weight)
 * - Historical accuracy based on fact-check correlations (40% weight)
 * - Transparency rating (20% weight)
 */

import {
  findSourceCredibilityById,
  updateSourceCredibility,
  getSourcesNeedingRecalculation,
} from "~/data-access/source-credibility";

/**
 * Weight factors for credibility calculation
 */
const WEIGHTS = {
  USER_FEEDBACK: 0.4,
  ACCURACY: 0.4,
  TRANSPARENCY: 0.2,
};

/**
 * Calculate the overall credibility score from component ratings.
 *
 * @param userFeedbackScore - Average user rating (1-5 scale)
 * @param accuracyRating - Accuracy rating (0-1 scale)
 * @param transparencyRating - Transparency rating (0-1 scale)
 * @returns Credibility score (0-100) or null if no data
 */
export function calculateCredibilityScore(
  userFeedbackScore: number | null,
  accuracyRating: number | null,
  transparencyRating: number | null
): number | null {
  let score = 0;
  let weightSum = 0;

  // User feedback contributes 40%
  // Convert 1-5 scale to 0-100
  if (userFeedbackScore !== null) {
    const feedbackScore = ((userFeedbackScore - 1) / 4) * 100;
    score += feedbackScore * WEIGHTS.USER_FEEDBACK;
    weightSum += WEIGHTS.USER_FEEDBACK;
  }

  // Accuracy rating contributes 40%
  // Convert 0-1 scale to 0-100
  if (accuracyRating !== null) {
    score += accuracyRating * 100 * WEIGHTS.ACCURACY;
    weightSum += WEIGHTS.ACCURACY;
  }

  // Transparency rating contributes 20%
  // Convert 0-1 scale to 0-100
  if (transparencyRating !== null) {
    score += transparencyRating * 100 * WEIGHTS.TRANSPARENCY;
    weightSum += WEIGHTS.TRANSPARENCY;
  }

  // Return null if we have no data at all
  if (weightSum === 0) {
    return null;
  }

  // Normalize the score based on available components
  return Math.round(score / weightSum);
}

/**
 * Get the credibility label for a score.
 */
export function getCredibilityLabel(score: number): string {
  if (score >= 80) return "Highly Reliable";
  if (score >= 60) return "Reliable";
  if (score >= 40) return "Mixed";
  if (score >= 20) return "Questionable";
  return "Unreliable";
}

/**
 * Get the color identifier for a score.
 */
export function getCredibilityColor(
  score: number
): "green" | "blue" | "yellow" | "orange" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "blue";
  if (score >= 40) return "yellow";
  if (score >= 20) return "orange";
  return "red";
}

/**
 * Calculate accuracy rating based on fact-check correlation.
 *
 * This compares the source's articles against fact-checking results.
 * A higher accuracy means articles from this source are more often
 * verified as accurate by fact-checkers.
 *
 * @param factCheckedArticleCount - Number of articles that were fact-checked
 * @param accurateArticleCount - Number of articles that passed fact-checking
 * @returns Accuracy rating (0-1) or null if insufficient data
 */
export function calculateAccuracyRating(
  factCheckedArticleCount: number,
  accurateArticleCount: number
): number | null {
  // Need at least 3 fact-checked articles for meaningful rating
  if (factCheckedArticleCount < 3) {
    return null;
  }

  return accurateArticleCount / factCheckedArticleCount;
}

/**
 * Calculate transparency rating based on source practices.
 *
 * This is a placeholder for more sophisticated analysis.
 * In a production system, this could consider:
 * - Whether sources are clearly attributed
 * - Whether corrections are published
 * - Whether methodology is disclosed
 * - Whether ownership is transparent
 *
 * @param hasAboutPage - Source has an about/methodology page
 * @param publishesCorrections - Source publishes corrections
 * @param ownershipDisclosed - Source ownership is disclosed
 * @returns Transparency rating (0-1)
 */
export function calculateTransparencyRating(
  hasAboutPage: boolean = false,
  publishesCorrections: boolean = false,
  ownershipDisclosed: boolean = false
): number {
  let score = 0;

  if (hasAboutPage) score += 0.4;
  if (publishesCorrections) score += 0.3;
  if (ownershipDisclosed) score += 0.3;

  return score;
}

/**
 * Calculate bias rating based on content analysis.
 *
 * Returns a value from -1.0 (far left) to 1.0 (far right), with 0 being neutral.
 * This is a placeholder - actual implementation would require NLP analysis.
 *
 * @param leftLeaningIndicators - Count of left-leaning indicators
 * @param rightLeaningIndicators - Count of right-leaning indicators
 * @returns Bias rating (-1 to 1)
 */
export function calculateBiasRating(
  leftLeaningIndicators: number = 0,
  rightLeaningIndicators: number = 0
): number {
  const total = leftLeaningIndicators + rightLeaningIndicators;
  if (total === 0) return 0;

  // Scale from -1 to 1
  const bias =
    (rightLeaningIndicators - leftLeaningIndicators) / total;
  return Math.max(-1, Math.min(1, bias));
}

/**
 * Get bias label from rating.
 */
export function getBiasLabel(bias: number): string {
  if (bias <= -0.6) return "Far Left";
  if (bias <= -0.2) return "Left-Leaning";
  if (bias <= 0.2) return "Center";
  if (bias <= 0.6) return "Right-Leaning";
  return "Far Right";
}

/**
 * Recalculate credibility score for a source and persist it.
 */
export async function recalculateAndPersistCredibility(
  sourceId: string
): Promise<void> {
  const source = await findSourceCredibilityById(sourceId);
  if (!source) return;

  const newScore = calculateCredibilityScore(
    source.userFeedbackScore,
    source.accuracyRating,
    source.transparencyRating
  );

  await updateSourceCredibility(sourceId, {
    credibilityScore: newScore,
    lastCalculatedAt: new Date(),
  });
}

/**
 * Batch recalculate credibility for sources needing updates.
 * This should be run periodically (e.g., daily cron job).
 */
export async function batchRecalculateCredibility(): Promise<{
  processed: number;
  updated: number;
}> {
  const sources = await getSourcesNeedingRecalculation(24);

  let updated = 0;
  for (const source of sources) {
    const oldScore = source.credibilityScore;
    await recalculateAndPersistCredibility(source.id);

    const updatedSource = await findSourceCredibilityById(source.id);
    if (updatedSource?.credibilityScore !== oldScore) {
      updated++;
    }
  }

  return { processed: sources.length, updated };
}
