import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Home,
  Newspaper,
  ArrowLeft,
  ExternalLink,
  Clock,
  Minus,
  Plus,
  Type,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Page } from "~/components/Page";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tooltip } from "~/components/ui/tooltip";
import { getArticleByIdQuery } from "~/queries/articles";
import type { ArticleSentiment, FactCheckStatus } from "~/db/schema";
import { getCredibilityLabel, getCredibilityColor } from "~/services/fact-checking";

export const Route = createFileRoute("/article/$id/")({
  loader: ({ context: { queryClient }, params: { id } }) => {
    queryClient.ensureQueryData(getArticleByIdQuery(id));
  },
  component: ArticleReader,
});

type FontSize = "small" | "medium" | "large";

const fontSizeClasses: Record<FontSize, { body: string; title: string }> = {
  small: {
    body: "text-base leading-relaxed",
    title: "text-2xl sm:text-3xl",
  },
  medium: {
    body: "text-lg leading-relaxed",
    title: "text-3xl sm:text-4xl",
  },
  large: {
    body: "text-xl leading-loose",
    title: "text-4xl sm:text-5xl",
  },
};

function formatPublishedDate(date: Date | null): string {
  if (!date) return "Unknown date";
  const articleDate = new Date(date);
  return articleDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function CredibilityBadgeReader({
  status,
  score,
}: {
  status: FactCheckStatus | null;
  score: number | null;
}) {
  if (!status || status === "pending" || status === "failed" || score === null) {
    return null;
  }

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
    <Tooltip content={`Credibility Score: ${score}%`}>
      <Badge variant="outline" className={`text-xs ${colorClasses[color]}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    </Tooltip>
  );
}

function ArticleReader() {
  const { id } = Route.useParams();
  const { data: article, isLoading, error } = useQuery(getArticleByIdQuery(id));
  const [fontSize, setFontSize] = useState<FontSize>("medium");

  const increaseFontSize = () => {
    if (fontSize === "small") setFontSize("medium");
    else if (fontSize === "medium") setFontSize("large");
  };

  const decreaseFontSize = () => {
    if (fontSize === "large") setFontSize("medium");
    else if (fontSize === "medium") setFontSize("small");
  };

  if (isLoading) {
    return (
      <Page>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-3 pt-8">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-4/5"></div>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  if (error || !article) {
    return (
      <Page>
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">
            Article Not Found
          </h1>
          <p className="text-muted-foreground">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </Page>
    );
  }

  const content = article.content || article.summary || "No content available for this article.";

  return (
    <Page className="pb-16">
      <article className="max-w-3xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <AppBreadcrumb
            items={[
              { label: "Home", href: "/", icon: Home },
              { label: "Article", icon: Newspaper },
            ]}
          />
        </div>

        {/* Reader Controls */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 mb-6 border-b border-border">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-2">
                <Type className="w-3 h-3 inline mr-1" />
                Text Size
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={decreaseFontSize}
                disabled={fontSize === "small"}
                className="h-8 w-8 p-0"
                aria-label="Decrease font size"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center capitalize">
                {fontSize}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={increaseFontSize}
                disabled={fontSize === "large"}
                className="h-8 w-8 p-0"
                aria-label="Increase font size"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            <Button variant="outline" size="sm" asChild>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Original
              </a>
            </Button>
          </div>
        </div>

        {/* Article Header */}
        <header className="mb-8 space-y-4">
          <h1 className={`font-bold tracking-tight ${fontSizeClasses[fontSize].title}`}>
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              <Newspaper className="w-3 h-3 mr-1" />
              {article.source}
            </Badge>

            <SentimentBadge sentiment={article.sentiment as ArticleSentiment | null} />

            <CredibilityBadgeReader
              status={article.factCheckStatus as FactCheckStatus | null}
              score={article.credibilityScore}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <time dateTime={article.publishedAt?.toISOString()}>
              {formatPublishedDate(article.publishedAt)}
            </time>
          </div>
        </header>

        {/* Summary Section */}
        {article.summary && article.content && (
          <div className="mb-8 p-4 bg-muted/50 rounded-lg border border-border">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Summary
            </h2>
            <p className={`text-foreground ${fontSizeClasses[fontSize].body}`}>
              {article.summary}
            </p>
          </div>
        )}

        {/* Article Content */}
        <div
          className={`prose prose-slate dark:prose-invert max-w-none ${fontSizeClasses[fontSize].body}`}
          style={{ lineHeight: fontSize === "large" ? "2" : "1.8" }}
        >
          {content.split("\n").map((paragraph, index) => (
            paragraph.trim() && (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            )
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Source: <span className="font-medium">{article.source}</span>
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Read on {article.source}
              </a>
            </Button>
          </div>
        </footer>
      </article>
    </Page>
  );
}
