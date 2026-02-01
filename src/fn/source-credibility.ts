import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware, optionalAuthMiddleware } from "./middleware";
import {
  findSourceCredibilityByName,
  getOrCreateSourceCredibility,
  getAllSourceCredibilities,
  getTopRatedSources,
  getLowestRatedSources,
  updateUserFeedbackScore,
  recalculateCredibilityScore,
  getCredibilityStats,
} from "~/data-access/source-credibility";
import {
  findUserSourceFeedback,
  upsertUserSourceFeedback,
  getSourceFeedbackWithUsers,
  getSourceFeedbackStats,
  deleteSourceFeedback,
} from "~/data-access/source-feedback";

/**
 * Get credibility info for a specific source.
 * Public endpoint - no authentication required.
 */
export const getSourceCredibilityFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ sourceName: z.string() }))
  .handler(async ({ data }) => {
    const { sourceName } = data;

    const credibility = await findSourceCredibilityByName(sourceName);

    return { credibility };
  });

/**
 * Get credibility info for a source, creating if it doesn't exist.
 * Used when displaying articles to ensure we have credibility data.
 */
export const getOrCreateSourceCredibilityFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ sourceName: z.string() }))
  .handler(async ({ data }) => {
    const { sourceName } = data;

    const credibility = await getOrCreateSourceCredibility(sourceName);

    return { credibility };
  });

/**
 * Get all source credibility records.
 * Public endpoint.
 */
export const getAllSourceCredibilitiesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { limit = 100, offset = 0 } = data;

    const sources = await getAllSourceCredibilities(limit, offset);

    return { sources };
  });

/**
 * Get top and lowest rated sources for overview.
 */
export const getSourceCredibilityOverviewFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ limit: z.number().optional() }))
  .handler(async ({ data }) => {
    const { limit = 5 } = data;

    const [topSources, lowestSources, stats] = await Promise.all([
      getTopRatedSources(limit),
      getLowestRatedSources(limit),
      getCredibilityStats(),
    ]);

    return { topSources, lowestSources, stats };
  });

/**
 * Submit user feedback for a source.
 * Requires authentication.
 */
export const submitSourceFeedbackFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      sourceName: z.string(),
      rating: z.number().min(1).max(5),
      feedback: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { sourceName, rating, feedback } = data;
    const userId = context.userId;

    // Get or create source credibility record
    const credibility = await getOrCreateSourceCredibility(sourceName);

    // Create or update user's feedback
    const userFeedback = await upsertUserSourceFeedback(
      userId,
      credibility.id,
      rating,
      feedback
    );

    // Update the source's feedback score
    await updateUserFeedbackScore(credibility.id);

    // Recalculate the overall credibility score
    const updatedCredibility = await recalculateCredibilityScore(credibility.id);

    return { feedback: userFeedback, credibility: updatedCredibility };
  });

/**
 * Get current user's feedback for a source.
 * Requires authentication.
 */
export const getUserSourceFeedbackFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ sourceName: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { sourceName } = data;
    const userId = context.userId;

    const credibility = await findSourceCredibilityByName(sourceName);
    if (!credibility) {
      return { feedback: null };
    }

    const feedback = await findUserSourceFeedback(userId, credibility.id);

    return { feedback };
  });

/**
 * Delete user's feedback for a source.
 * Requires authentication.
 */
export const deleteSourceFeedbackFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ sourceName: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { sourceName } = data;
    const userId = context.userId;

    const credibility = await findSourceCredibilityByName(sourceName);
    if (!credibility) {
      return { success: false };
    }

    const feedback = await findUserSourceFeedback(userId, credibility.id);
    if (!feedback) {
      return { success: false };
    }

    await deleteSourceFeedback(feedback.id);

    // Update the source's feedback score
    await updateUserFeedbackScore(credibility.id);

    // Recalculate the overall credibility score
    await recalculateCredibilityScore(credibility.id);

    return { success: true };
  });

/**
 * Get all feedback for a source.
 * Public endpoint - can optionally include user context.
 */
export const getSourceFeedbackListFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      sourceName: z.string(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    })
  )
  .middleware([optionalAuthMiddleware])
  .handler(async ({ data, context }) => {
    const { sourceName, limit = 20, offset = 0 } = data;

    const credibility = await findSourceCredibilityByName(sourceName);
    if (!credibility) {
      return { feedbacks: [], stats: null, userFeedback: null };
    }

    const [feedbacks, stats] = await Promise.all([
      getSourceFeedbackWithUsers(credibility.id, limit, offset),
      getSourceFeedbackStats(credibility.id),
    ]);

    // Get current user's feedback if authenticated
    let userFeedback = null;
    if (context.userId) {
      userFeedback = await findUserSourceFeedback(context.userId, credibility.id);
    }

    return { feedbacks, stats, userFeedback };
  });
