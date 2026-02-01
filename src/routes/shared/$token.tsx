import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Home,
  Newspaper,
  Filter,
  ArrowUpDown,
  Search,
  X,
  Share2,
  Globe,
} from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "~/components/ArticleCard";
import { EmptyState } from "~/components/EmptyState";
import { Page } from "~/components/Page";
import { PageTitle } from "~/components/PageTitle";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  getArticlesByTopicQuery,
  getArticleSourcesQuery,
  getArticleSentimentsQuery,
} from "~/queries/articles";
import { getSharedTopicFn } from "~/fn/topics";
import type { ArticleSentiment } from "~/db/schema";

const ARTICLES_PER_PAGE = 20;

export const Route = createFileRoute("/shared/$token")({
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const token = params.token;

    // Load shared topic data
    const topic = await getSharedTopicFn({ data: { token } });

    // Preload initial articles, sources, and sentiments
    queryClient.ensureQueryData(
      getArticlesByTopicQuery({ topicId: topic.id, limit: ARTICLES_PER_PAGE, offset: 0 })
    );
    queryClient.ensureQueryData(getArticleSourcesQuery(topic.id));
    queryClient.ensureQueryData(getArticleSentimentsQuery(topic.id));

    return { topic };
  },
  errorComponent: SharedTopicError,
  component: SharedTopicView,
});

function SharedTopicError() {
  return (
    <Page>
      <div className="space-y-6">
        <AppBreadcrumb
          items={[
            { label: "Home", href: "/", icon: Home },
            { label: "Shared Topic", icon: Share2 },
          ]}
        />

        <div className="text-center py-16 px-4 rounded-xl bg-muted/30 border border-dashed border-border/60">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
            <Share2 className="h-10 w-10 text-primary/60" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Topic not found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This shared topic link is invalid or has been revoked.
          </p>
          <Link to="/">
            <Button className="mt-6" size="lg">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </Page>
  );
}

type SortOption = "date" | "source" | "relevance";
type SortOrder = "asc" | "desc";

function SharedTopicView() {
  const { topic } = Route.useLoaderData();

  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedSource, setSelectedSource] = useState<string | undefined>();
  const [selectedSentiment, setSelectedSentiment] = useState<ArticleSentiment | undefined>();
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch articles with current filters
  const {
    data: articlesData,
    isLoading,
    isFetching,
  } = useQuery(
    getArticlesByTopicQuery({
      topicId: topic.id,
      limit: ARTICLES_PER_PAGE,
      offset,
      sortBy,
      sortOrder,
      source: selectedSource,
      sentiment: selectedSentiment,
    })
  );

  // Fetch available sources for filter
  const { data: sources = [] } = useQuery(getArticleSourcesQuery(topic.id));

  // Fetch available sentiments for filter
  const { data: sentiments = [] } = useQuery(getArticleSentimentsQuery(topic.id));

  const articles = articlesData?.articles || [];
  const totalCount = articlesData?.totalCount || 0;
  const hasMore = articlesData?.hasMore || false;

  // Filter articles by search query (client-side)
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.summary?.toLowerCase().includes(query) ||
        article.source.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  const handleSortChange = (newSortBy: SortOption) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setOffset(0);
  };

  const handleSourceChange = (source: string | undefined) => {
    setSelectedSource(source);
    setOffset(0);
  };

  const handleSentimentChange = (sentiment: ArticleSentiment | undefined) => {
    setSelectedSentiment(sentiment);
    setOffset(0);
  };

  const handleLoadMore = () => {
    setOffset((prev) => prev + ARTICLES_PER_PAGE);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const clearFilters = () => {
    setSelectedSource(undefined);
    setSelectedSentiment(undefined);
    setSortBy("date");
    setSortOrder("desc");
    setSearchQuery("");
    setOffset(0);
  };

  const hasActiveFilters = selectedSource || selectedSentiment || searchQuery || sortBy !== "date";

  // Parse keywords for display
  const keywords = topic.keywords.split(",").map((k) => k.trim()).filter(Boolean);

  return (
    <Page>
      <div className="space-y-6">
        <AppBreadcrumb
          items={[
            { label: "Home", href: "/", icon: Home },
            { label: "Shared Topic", icon: Share2 },
            { label: topic.name },
          ]}
        />

        <div className="flex items-center gap-2">
          {topic.isPublic && (
            <Badge variant="secondary" className="gap-1">
              <Globe className="w-3 h-3" />
              Public
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Share2 className="w-3 h-3" />
            Shared
          </Badge>
        </div>

        <PageTitle
          title={topic.name}
          description={topic.description || `${totalCount} article${totalCount !== 1 ? "s" : ""} found`}
        />

        {/* Keywords */}
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => (
            <Badge key={index} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-8"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Source Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {selectedSource || "All Sources"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSourceChange(undefined)}>
                  {!selectedSource && "✓ "}All Sources
                </DropdownMenuItem>
                {sources.map((source) => (
                  <DropdownMenuItem
                    key={source}
                    onClick={() => handleSourceChange(source)}
                  >
                    {selectedSource === source && "✓ "}
                    {source}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sentiment Filter */}
            {sentiments.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    {selectedSentiment
                      ? selectedSentiment.charAt(0).toUpperCase() + selectedSentiment.slice(1)
                      : "All Sentiments"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSentimentChange(undefined)}>
                    {!selectedSentiment && "✓ "}All Sentiments
                  </DropdownMenuItem>
                  {sentiments.map((sentiment) => (
                    <DropdownMenuItem
                      key={sentiment}
                      onClick={() => handleSentimentChange(sentiment)}
                    >
                      {selectedSentiment === sentiment && "✓ "}
                      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSortChange("relevance")}>
                  {sortBy === "relevance" && "✓ "}Relevance{" "}
                  {sortBy === "relevance" && (sortOrder === "desc" ? "↓" : "↑")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("date")}>
                  {sortBy === "date" && "✓ "}Date{" "}
                  {sortBy === "date" && (sortOrder === "desc" ? "↓" : "↑")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("source")}>
                  {sortBy === "source" && "✓ "}Source{" "}
                  {sortBy === "source" && (sortOrder === "desc" ? "↓" : "↑")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Articles Grid */}
        <section className="space-y-6" aria-labelledby="articles-heading">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredArticles.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    topicId={topic.id}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && !searchQuery && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isFetching}
                  >
                    {isFetching ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}

              {/* Pagination Info */}
              <div className="text-center text-sm text-muted-foreground">
                Showing {Math.min(offset + filteredArticles.length, totalCount)}{" "}
                of {totalCount} articles
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Newspaper className="h-10 w-10 text-primary/60" />}
              title="No articles found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters or search query."
                  : "No articles have been collected for this topic yet. Check back later!"
              }
              actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
              onAction={hasActiveFilters ? clearFilters : undefined}
            />
          )}
        </section>
      </div>
    </Page>
  );
}
