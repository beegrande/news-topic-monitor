import { useState } from "react";
import { MessageSquare, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  useArticleComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "~/hooks/useArticles";
import type { ArticleCommentWithUser } from "~/data-access/article-comments";

interface ArticleCommentsProps {
  articleId: string;
  topicId: string;
}

function formatCommentDate(date: Date): string {
  const now = new Date();
  const commentDate = new Date(date);
  const diffInMs = now.getTime() - commentDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return commentDate.toLocaleDateString();
}

function CommentItem({
  comment,
  articleId,
  topicId,
}: {
  comment: ArticleCommentWithUser;
  articleId: string;
  topicId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const handleSave = () => {
    if (editContent.trim() === "") return;
    updateComment.mutate(
      {
        commentId: comment.id,
        content: editContent.trim(),
        articleId,
        topicId,
      },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteComment.mutate({ commentId: comment.id, articleId, topicId });
  };

  if (isEditing) {
    return (
      <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="min-h-[80px] text-sm"
          placeholder="Edit your note..."
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={updateComment.isPending}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateComment.isPending || editContent.trim() === ""}
          >
            <Check className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-3 space-y-2 bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-foreground whitespace-pre-wrap flex-1">
          {comment.content}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setIsEditing(true)}
            title="Edit note"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteComment.isPending}
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {formatCommentDate(comment.createdAt)}
        {comment.updatedAt > comment.createdAt && " (edited)"}
      </div>
    </div>
  );
}

function CommentForm({
  articleId,
  topicId,
  onSuccess,
}: {
  articleId: string;
  topicId: string;
  onSuccess?: () => void;
}) {
  const [content, setContent] = useState("");
  const createComment = useCreateComment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() === "") return;

    createComment.mutate(
      { articleId, topicId, content: content.trim() },
      {
        onSuccess: () => {
          setContent("");
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a private note about this article..."
        className="min-h-[80px] text-sm"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={createComment.isPending || content.trim() === ""}
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          Add Note
        </Button>
      </div>
    </form>
  );
}

export function ArticleComments({ articleId, topicId }: ArticleCommentsProps) {
  const { data: comments, isLoading } = useArticleComments({
    articleId,
    topicId,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquare className="w-4 h-4" />
        <span>My Notes</span>
        {comments && comments.length > 0 && (
          <span className="text-muted-foreground">({comments.length})</span>
        )}
      </div>

      <CommentForm articleId={articleId} topicId={topicId} />

      {isLoading ? (
        <div className="space-y-2">
          <div className="border border-border rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/4 mt-2"></div>
          </div>
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              articleId={articleId}
              topicId={topicId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
