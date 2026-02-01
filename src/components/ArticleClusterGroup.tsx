import { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import type { Article } from "~/db/schema";
import { ArticleCard } from "./ArticleCard";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export interface ArticleCluster {
  id: string;
  name: string;
  articles: Article[];
  representativeArticle: Article;
}

interface ArticleClusterGroupProps {
  cluster: ArticleCluster;
  topicId: string;
  defaultExpanded?: boolean;
}

export function ArticleClusterGroup({
  cluster,
  topicId,
  defaultExpanded = false,
}: ArticleClusterGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasMultipleArticles = cluster.articles.length > 1;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Cluster Header */}
      <div
        className={`p-4 ${hasMultipleArticles ? "cursor-pointer hover:bg-muted/50" : ""}`}
        onClick={() => hasMultipleArticles && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-sm text-muted-foreground truncate">
                {cluster.name}
              </h3>
            </div>
            {hasMultipleArticles && (
              <Badge variant="secondary" className="text-xs">
                {cluster.articles.length} related articles
              </Badge>
            )}
          </div>
          {hasMultipleArticles && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Representative Article (always visible) */}
      <div className="px-4 pb-4">
        <ArticleCard
          article={cluster.representativeArticle}
          topicId={topicId}
          showFeedback
        />
      </div>

      {/* Additional Articles (expandable) */}
      {hasMultipleArticles && isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-4 bg-muted/30">
          <p className="text-xs text-muted-foreground font-medium">
            Related coverage ({cluster.articles.length - 1} more):
          </p>
          <div className="space-y-3">
            {cluster.articles.slice(1).map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                topicId={topicId}
                showFeedback
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ArticleClusterListProps {
  clusters: ArticleCluster[];
  topicId: string;
}

export function ArticleClusterList({ clusters, topicId }: ArticleClusterListProps) {
  if (clusters.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {clusters.map((cluster) => (
        <ArticleClusterGroup
          key={cluster.id}
          cluster={cluster}
          topicId={topicId}
        />
      ))}
    </div>
  );
}

export function ArticleClusterSkeleton() {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card animate-pulse">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
        <div className="h-5 bg-muted rounded w-24"></div>
      </div>
      <div className="px-4 pb-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
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
    </div>
  );
}
