import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createComment,
  findCommentById,
  findCommentsByArticleId,
  updateComment,
  deleteComment,
  isCommentOwner,
} from "~/data-access/article-comments";
import { findArticleById } from "~/data-access/articles";
import { findTopicById } from "~/data-access/topics";

export const createArticleCommentFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      articleId: z.string(),
      topicId: z.string(),
      content: z.string().min(1, "Comment cannot be empty").max(5000, "Comment is too long"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { articleId, topicId, content } = data;

    // Verify article exists
    const article = await findArticleById(articleId);
    if (!article) {
      throw new Error("Article not found");
    }

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only add comments to your own topics");
    }

    const comment = await createComment({
      id: crypto.randomUUID(),
      userId: context.userId,
      articleId,
      topicId,
      content,
    });

    return comment;
  });

export const getArticleCommentsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      articleId: z.string(),
      topicId: z.string(),
      limit: z.number().min(1).max(100).optional().default(50),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { articleId, topicId, limit } = data;

    // Verify topic exists and belongs to user
    const topic = await findTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }
    if (topic.userId !== context.userId) {
      throw new Error("Unauthorized: You can only view comments on your own topics");
    }

    const comments = await findCommentsByArticleId(articleId, topicId, context.userId, limit);

    return comments;
  });

export const updateArticleCommentFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      commentId: z.string(),
      content: z.string().min(1, "Comment cannot be empty").max(5000, "Comment is too long"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { commentId, content } = data;

    // Verify comment exists
    const existingComment = await findCommentById(commentId);
    if (!existingComment) {
      throw new Error("Comment not found");
    }

    // Verify user owns the comment
    if (existingComment.userId !== context.userId) {
      throw new Error("Unauthorized: You can only edit your own comments");
    }

    const updatedComment = await updateComment(commentId, { content });

    return updatedComment;
  });

export const deleteArticleCommentFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      commentId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { commentId } = data;

    // Verify comment exists
    const existingComment = await findCommentById(commentId);
    if (!existingComment) {
      throw new Error("Comment not found");
    }

    // Verify user owns the comment
    if (existingComment.userId !== context.userId) {
      throw new Error("Unauthorized: You can only delete your own comments");
    }

    const deleted = await deleteComment(commentId);

    return { success: deleted };
  });
