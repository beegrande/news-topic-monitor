import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Sparkles, TrendingUp, Users, RefreshCw, Info } from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "~/components/ArticleCard";
import { EmptyState } from "~/components/EmptyState";
import { Page } from "~/components/Page";
import { PageTitle } from "~/components/PageTitle";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { getRecommendedArticlesQuery, getRecommendationStatsQuery } from "~/queries/recommendations";
import { authClient } from "~/lib/auth-client";
import type { RecommendedArticle } from "~/fn/recommendations";

export const Route = createFileRoute("/recommendations")({
  component: RecommendationsPage,
});

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

function StatsCard() {
  const { data: stats, isLoading } = useQuery(getRecommendationStatsQuery());

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Info className="w-4 h-4" />
        How recommendations work
      </h3>

      <div className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
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
          <span>
            {stats.recommendationMode === "collaborative"
              ? "Based on users with similar interests"
              : "Based on topic relevance"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <div>
              <div className="font-medium text-foreground">
                {stats.interactionCounts.total}
              </div>
              <div className="text-xs">Total interactions</div>
            </div>
          </div>

          {stats.similarUserCount > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <div className="font-medium text-foreground">
                  {stats.similarUserCount}
                </div>
                <div className="text-xs">Similar users</div>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs border-t pt-3 mt-3">
          {stats.hasEnoughData
            ? "The more you read and rate articles, the better your recommendations become."
            : "Interact with more articles to unlock personalized recommendations."}
        </p>
      </div>
    </div>
  );
}

function RecommendationsPage() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const {
    data: articles,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    ...getRecommendedArticlesQuery({ limit: 20 }),
    enabled: !!session?.user,
  });

  const handleRefresh = () => {
    refetch();
  };

  // Show loading while checking session
  if (isSessionPending) {
    return (
      <Page>
        <div className="space-y-8">
          <AppBreadcrumb
            items={[
              { label: "Home", href: "/", icon: Home },
              { label: "Recommendations", icon: Sparkles },
            ]}
          />
          <PageTitle
            title="Recommended Articles"
            description="Personalized article recommendations based on your interests"
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </Page>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    return (
      <Page>
        <div className="space-y-8">
          <AppBreadcrumb
            items={[
              { label: "Home", href: "/", icon: Home },
              { label: "Recommendations", icon: Sparkles },
            ]}
          />
          <PageTitle
            title="Recommended Articles"
            description="Personalized article recommendations based on your interests"
          />
          <EmptyState
            icon={<Sparkles className="h-10 w-10 text-purple-500/60" />}
            title="Sign in required"
            description="Please sign in to view your personalized recommendations."
            actionLabel="Sign In"
            onAction={() => navigate({ to: "/sign-in", search: {} })}
          />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="space-y-8">
        <AppBreadcrumb
          items={[
            { label: "Home", href: "/", icon: Home },
            { label: "Recommendations", icon: Sparkles },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageTitle
            title="Recommended Articles"
            description="Personalized article recommendations based on your interests"
          />
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))}
              </div>
            ) : articles && articles.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {articles.map((article) => (
                  <RecommendedArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Sparkles className="h-10 w-10 text-purple-500/60" />}
                title="No recommendations yet"
                description="Start reading and rating articles to get personalized recommendations. The more you interact, the better the recommendations become!"
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <StatsCard />
          </div>
        </div>
      </div>
    </Page>
  );
}
