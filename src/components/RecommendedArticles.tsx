import { Link } from "@tanstack/react-router";
import { Sparkles, TrendingUp, Users, RefreshCw, ChevronRight } from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "~/components/ArticleCard";
import { EmptyState } from "~/components/EmptyState";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useRecommendedArticles, useRecommendationStats } from "~/hooks/useRecommendations";
import type { RecommendedArticle } from "~/fn/recommendations";

interface RecommendedArticlesProps {
  limit?: number;
  showHeader?: boolean;
  showStats?: boolean;
}

function RecommendationBadge({ reason, score }: { reason: string; score: number }) {
  const percentage = Math.round(score * 100);

  return (
    <div className="flex items-center gap-2 mb-2">
      <Badge
        variant="outline"
        className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      >
        <Sparkles className="w-3 h-3 mr-1" />
        {percentage}% match
      </Badge>
      <span className="text-xs text-muted-foreground">{reason}</span>
    </div>
  );
}

function RecommendedArticleCard({ article }: { article: RecommendedArticle }) {
  return (
    <div className="space-y-1">
      <RecommendationBadge
        reason={article.recommendationReason}
        score={article.recommendationScore}
      />
      <ArticleCard
        article={article}
        topicId={article.topicId}
        showFeedback
      />
      {article.topicName && (
        <div className="text-xs text-muted-foreground pl-1">
          From topic: <span className="font-medium">{article.topicName}</span>
        </div>
      )}
    </div>
  );
}

function RecommendationStatsBar() {
  const { data: stats, isLoading } = useRecommendationStats();

  if (isLoading || !stats) return null;

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <TrendingUp className="w-4 h-4" />
        <span>{stats.interactionCounts.total} interactions</span>
      </div>
      {stats.similarUserCount > 0 && (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{stats.similarUserCount} similar users</span>
        </div>
      )}
      <Badge
        variant="outline"
        className={
          stats.recommendationMode === "collaborative"
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        }
      >
        {stats.recommendationMode === "collaborative" ? "Personalized" : "Topic-based"}
      </Badge>
    </div>
  );
}

export function RecommendedArticles({
  limit = 6,
  showHeader = true,
  showStats = false
}: RecommendedArticlesProps) {
  const { data: articles, isLoading, refetch, isFetching } = useRecommendedArticles({ limit });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <section className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Recommended for You
            </h2>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: limit }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <section className="space-y-4">
        {showHeader && (
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Recommended for You
          </h2>
        )}
        <EmptyState
          icon={<Sparkles className="h-10 w-10 text-purple-500/60" />}
          title="No recommendations yet"
          description="Start reading and rating articles to get personalized recommendations. The more you interact, the better the recommendations become!"
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Recommended for You
            </h2>
            {showStats && <RecommendationStatsBar />}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="text-muted-foreground"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/recommendations">
              <Button variant="outline" size="sm" className="gap-1">
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <RecommendedArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

export function RecommendedArticlesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}
