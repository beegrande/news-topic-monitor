import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Article, ArticleSentiment, FactCheckStatus } from "~/db/schema";
import {
  ExternalLink,
  Clock,
  Newspaper,
  TrendingUp,
  TrendingDown,
  Minus,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Loader2,
  BookOpen,
  Star,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tooltip } from "~/components/ui/tooltip";
import {
  useRecordArticleClick,
  useSubmitArticleFeedback,
  useRemoveArticleFeedback,
  useArticleFeedback,
  useCheckArticleFacts,
} from "~/hooks/useArticles";
import { ArticleComments } from "~/components/ArticleComments";
import { getCredibilityLabel, getCredibilityColor } from "~/services/fact-checking";
import { formatReadingTime } from "~/utils/reading-time";
import { SourceCredibilityBadge } from "~/components/SourceCredibilityBadge";
import { SourceFeedbackDialog } from "~/components/SourceFeedbackDialog";

interface ArticleWithRelevance extends Article {
  relevanceScore?: number | null;
}

function CredibilityBadge({
  status,
  score,
  articleId,
  topicId,
}: {
  status: FactCheckStatus | null;
  score: number | null;
  articleId: string;
  topicId?: string;
}) {
  const checkFacts = useCheckArticleFacts();

  const handleCheckFacts = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (topicId) {
      checkFacts.mutate({ articleId, topicId });
    }
  };

  // Not checked yet - show button to check
  if (!status || status === "pending") {
    if (!topicId) return null;
    return (
      <Tooltip content="Check article credibility with fact-checking sources">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleCheckFacts}
          disabled={checkFacts.isPending}
        >
          {checkFacts.isPending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <ShieldQuestion className="w-3 h-3 mr-1" />
          )}
          Check Facts
        </Button>
      </Tooltip>
    );
  }

  // Failed - show error state
  if (status === "failed") {
    return (
      <Tooltip content="Fact-check unavailable for this article">
        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400">
          <ShieldQuestion className="w-3 h-3 mr-1" />
          Unavailable
        </Badge>
      </Tooltip>
    );
  }

  // Checked - show credibility score
  if (score === null) return null;

  const color = getCredibilityColor(score);
  const label = getCredibilityLabel(score);

  const colorClasses: Record<string, string> = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const IconComponent = score >= 60 ? ShieldCheck : ShieldAlert;

  return (
    <Tooltip content={`Credibility Score: ${score}% - Based on fact-checking sources`}>
      <Badge variant="outline" className={`text-xs ${colorClasses[color]}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    </Tooltip>
  );
}

interface ArticleCardProps {
  article: ArticleWithRelevance;
  topicId?: string;
  showFeedback?: boolean;
  showNotes?: boolean;
}

function formatPublishedDate(date: Date | null): string {
  if (!date) return "Unknown date";
  const now = new Date();
  const articleDate = new Date(date);
  const diffInMs = now.getTime() - articleDate.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return articleDate.toLocaleDateString();
}

function SentimentBadge({ sentiment }: { sentiment: ArticleSentiment | null }) {
  if (!sentiment) return null;

  const config = {
    positive: {
      icon: TrendingUp,
      label: "Positive",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    negative: {
      icon: TrendingDown,
      label: "Negative",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    neutral: {
      icon: Minus,
      label: "Neutral",
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
    },
  }[sentiment];

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function RelevanceBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return null;

  const percentage = Math.round(score * 100);
  let className = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

  if (percentage >= 70) {
    className = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  } else if (percentage >= 50) {
    className = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  } else {
    className = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }

  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      <Sparkles className="w-3 h-3 mr-1" />
      {percentage}%
    </Badge>
  );
}

function FeedbackButtons({
  articleId,
  topicId,
}: {
  articleId: string;
  topicId: string;
}) {
  const { data: feedback, isLoading } = useArticleFeedback(articleId, topicId);
  const submitFeedback = useSubmitArticleFeedback();
  const removeFeedback = useRemoveArticleFeedback();

  const handleFeedback = (
    e: React.MouseEvent,
    feedbackType: "helpful" | "not_helpful"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (feedback?.userFeedback === feedbackType) {
      // Remove feedback if clicking the same button
      removeFeedback.mutate({ articleId, topicId });
    } else {
      submitFeedback.mutate({ articleId, topicId, feedback: feedbackType });
    }
  };

  const isPending = submitFeedback.isPending || removeFeedback.isPending;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-2 ${
          feedback?.userFeedback === "helpful"
            ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20"
            : "text-muted-foreground hover:text-green-600"
        }`}
        onClick={(e) => handleFeedback(e, "helpful")}
        disabled={isPending || isLoading}
        title="Mark as helpful"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        {feedback && feedback.helpfulCount > 0 && (
          <span className="ml-1 text-xs">{feedback.helpfulCount}</span>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-2 ${
          feedback?.userFeedback === "not_helpful"
            ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
            : "text-muted-foreground hover:text-red-600"
        }`}
        onClick={(e) => handleFeedback(e, "not_helpful")}
        disabled={isPending || isLoading}
        title="Mark as not helpful"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        {feedback && feedback.notHelpfulCount > 0 && (
          <span className="ml-1 text-xs">{feedback.notHelpfulCount}</span>
        )}
      </Button>
    </div>
  );
}

export function ArticleCard({ article, topicId, showFeedback, showNotes = true }: ArticleCardProps) {
  const recordClick = useRecordArticleClick();
  const [notesExpanded, setNotesExpanded] = useState(false);

  const handleClick = () => {
    if (topicId) {
      recordClick.mutate({ articleId: article.id, topicId });
    }
  };

  const handleToggleNotes = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotesExpanded(!notesExpanded);
  };

  return (
    <article className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-lg hover:border-border/60 transition-all duration-200 group">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
        onClick={handleClick}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors flex-1">
              {article.title}
            </h3>
            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {article.summary && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
              {article.summary}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 flex-wrap">
              <SourceFeedbackDialog
                sourceName={article.source}
                trigger={
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Newspaper className="w-3 h-3 mr-1" />
                    {article.source}
                    <Star className="w-3 h-3 ml-1 text-muted-foreground" />
                  </Badge>
                }
              />
              <SourceCredibilityBadge sourceName={article.source} size="sm" />
              <SentimentBadge sentiment={article.sentiment as ArticleSentiment | null} />
              <RelevanceBadge score={article.relevanceScore} />
              <CredibilityBadge
                status={article.factCheckStatus as FactCheckStatus | null}
                score={article.credibilityScore}
                articleId={article.id}
                topicId={topicId}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1" title="Estimated reading time">
                <BookOpen className="w-3 h-3" />
                {formatReadingTime(article.title, article.summary, article.content)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <time dateTime={article.publishedAt?.toISOString()}>
                  {formatPublishedDate(article.publishedAt)}
                </time>
              </span>
            </div>
          </div>

          {showFeedback && topicId && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                Was this article helpful?
              </span>
              <FeedbackButtons articleId={article.id} topicId={topicId} />
            </div>
          )}
        </div>
      </a>

      {/* Reader Mode Link */}
      <div className="border-t border-border/50 px-4 py-2">
        <Link
          to={`/article/${article.id}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <BookOpen className="w-4 h-4" />
          <span>Read in Reader Mode</span>
        </Link>
      </div>

      {/* Notes Toggle and Section */}
      {showNotes && topicId && (
        <div className="border-t border-border/50">
          <button
            onClick={handleToggleNotes}
            className="w-full px-4 py-2 flex items-center justify-between text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              My Notes
            </span>
            {notesExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {notesExpanded && (
            <div className="px-4 pb-4">
              <ArticleComments articleId={article.id} topicId={topicId} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function ArticleCardSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden animate-pulse">
      <div className="p-4 space-y-3">
        <div className="h-5 bg-muted rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="h-5 bg-muted rounded w-20"></div>
          <div className="h-4 bg-muted rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}
