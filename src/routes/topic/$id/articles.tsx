import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Home,
  Newspaper,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  Search,
  X,
  Layers,
  List,
  Download,
  Globe,
} from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "~/components/ArticleCard";
import { ExportDialog } from "~/components/ExportDialog";
import {
  ArticleClusterList,
  ArticleClusterSkeleton,
} from "~/components/ArticleClusterGroup";
import { EmptyState } from "~/components/EmptyState";
import { Page } from "~/components/Page";
import { PageTitle } from "~/components/PageTitle";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
  getArticleCountriesQuery,
  getClusteredArticlesQuery,
} from "~/queries/articles";
import { getTopicByIdFn } from "~/fn/topics";
import type { ArticleSentiment } from "~/db/schema";

const ARTICLES_PER_PAGE = 20;

export const Route = createFileRoute("/topic/$id/articles")({
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const topicId = params.id;

    // Load topic data
    const topic = await getTopicByIdFn({ data: { id: topicId } });

    // Preload initial articles, sources, sentiments, and countries
    queryClient.ensureQueryData(
      getArticlesByTopicQuery({ topicId, limit: ARTICLES_PER_PAGE, offset: 0 })
    );
    queryClient.ensureQueryData(getArticleSourcesQuery(topicId));
    queryClient.ensureQueryData(getArticleSentimentsQuery(topicId));
    queryClient.ensureQueryData(getArticleCountriesQuery(topicId));

    return { topic };
  },
  component: TopicArticles,
});

type SortOption = "date" | "source" | "relevance";
type SortOrder = "asc" | "desc";
type ViewMode = "list" | "clustered";

function TopicArticles() {
  const { id: topicId } = Route.useParams();
  const { topic } = Route.useLoaderData();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedSource, setSelectedSource] = useState<string | undefined>();
  const [selectedSentiment, setSelectedSentiment] = useState<ArticleSentiment | undefined>();
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>();
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch articles with current filters
  const {
    data: articlesData,
    isLoading,
    isFetching,
  } = useQuery(
    getArticlesByTopicQuery({
      topicId,
      limit: ARTICLES_PER_PAGE,
      offset,
      sortBy,
      sortOrder,
      source: selectedSource,
      sentiment: selectedSentiment,
      country: selectedCountry,
    })
  );

  // Fetch available sources for filter
  const { data: sources = [] } = useQuery(getArticleSourcesQuery(topicId));

  // Fetch available sentiments for filter
  const { data: sentiments = [] } = useQuery(getArticleSentimentsQuery(topicId));

  // Fetch available countries for filter
  const { data: countries = [] } = useQuery(getArticleCountriesQuery(topicId));

  // Fetch clustered articles when in clustered view mode
  const {
    data: clusteredData,
    isLoading: isClusterLoading,
  } = useQuery({
    ...getClusteredArticlesQuery({ topicId, limit: 50 }),
    enabled: viewMode === "clustered",
  });

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
      // Toggle sort order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setOffset(0); // Reset to first page
  };

  const handleSourceChange = (source: string | undefined) => {
    setSelectedSource(source);
    setOffset(0); // Reset to first page
  };

  const handleSentimentChange = (sentiment: ArticleSentiment | undefined) => {
    setSelectedSentiment(sentiment);
    setOffset(0); // Reset to first page
  };

  const handleCountryChange = (country: string | undefined) => {
    setSelectedCountry(country);
    setOffset(0); // Reset to first page
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
    setSelectedCountry(undefined);
    setSortBy("date");
    setSortOrder("desc");
    setSearchQuery("");
    setOffset(0);
  };

  const hasActiveFilters = selectedSource || selectedSentiment || selectedCountry || searchQuery || sortBy !== "date";

  const clusters = clusteredData?.clusters || [];

  return (
    <Page>
      <div className="space-y-6">
        <AppBreadcrumb
          items={[
            { label: "Home", href: "/", icon: Home },
            { label: topic.name },
            { label: "Articles", icon: Newspaper },
          ]}
        />

        <div className="flex items-center gap-4">
          <a href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          </a>
        </div>

        <PageTitle
          title={`Articles for "${topic.name}"`}
          description={`${totalCount} article${totalCount !== 1 ? "s" : ""} found`}
        />

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            List
          </Button>
          <Button
            variant={viewMode === "clustered" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("clustered")}
            className="gap-2"
          >
            <Layers className="w-4 h-4" />
            Clustered
          </Button>
        </div>

        {/* Filters and Search (only shown in list view) */}
        {viewMode === "list" && (
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

            {/* Country Filter */}
            {countries.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Globe className="w-4 h-4" />
                    {selectedCountry || "All Countries"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleCountryChange(undefined)}>
                    {!selectedCountry && "✓ "}All Countries
                  </DropdownMenuItem>
                  {countries.map((country) => (
                    <DropdownMenuItem
                      key={country}
                      onClick={() => handleCountryChange(country)}
                    >
                      {selectedCountry === country && "✓ "}
                      {country}
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

            {/* Export Button */}
            <ExportDialog
              topic={topic}
              sources={sources}
              sentiments={sentiments}
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              }
            />
          </div>
        </div>
        )}

        {/* Articles Content */}
        <section className="space-y-6" aria-labelledby="articles-heading">
          {viewMode === "list" ? (
            // List View
            isLoading ? (
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
                      topicId={topicId}
                      showFeedback
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
            )
          ) : (
            // Clustered View
            isClusterLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ArticleClusterSkeleton key={i} />
                ))}
              </div>
            ) : clusters.length > 0 ? (
              <>
                <div className="text-sm text-muted-foreground mb-4">
                  {clusteredData?.totalArticles} articles grouped into {clusteredData?.totalClusters} story clusters
                </div>
                <ArticleClusterList clusters={clusters} topicId={topicId} />
              </>
            ) : (
              <EmptyState
                icon={<Layers className="h-10 w-10 text-primary/60" />}
                title="No clusters found"
                description="No articles have been collected for this topic yet. Check back later!"
              />
            )
          )}
        </section>
      </div>
    </Page>
  );
}
