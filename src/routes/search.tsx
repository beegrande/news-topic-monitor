import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Home,
  Search,
  X,
  Filter,
  Calendar,
  Newspaper,
  Bookmark,
} from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "~/components/ArticleCard";
import { EmptyState } from "~/components/EmptyState";
import { Page } from "~/components/Page";
import { PageTitle } from "~/components/PageTitle";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { SaveSearchDialog } from "~/components/SaveSearchDialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useSearchArticles, useArticleSourcesAll } from "~/hooks/useArticles";
import { useTopics } from "~/hooks/useTopics";

const ARTICLES_PER_PAGE = 20;

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || undefined,
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();

  // Initialize from URL param (only on mount)
  const [searchQuery, setSearchQuery] = useState(q || "");
  const [debouncedQuery, setDebouncedQuery] = useState(q || "");
  const [selectedSource, setSelectedSource] = useState<string | undefined>();
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [offset, setOffset] = useState(0);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setOffset(0); // Reset pagination on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results
  const {
    data: searchData,
    isLoading,
    isFetching,
  } = useSearchArticles({
    query: debouncedQuery,
    topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
    source: selectedSource,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: ARTICLES_PER_PAGE,
    offset,
  });

  // Fetch available sources and topics for filters
  const { data: sources = [] } = useArticleSourcesAll();
  const { data: topics = [] } = useTopics();

  const articles = searchData?.articles || [];
  const totalCount = searchData?.totalCount || 0;
  const hasMore = searchData?.hasMore || false;

  const handleLoadMore = () => {
    setOffset((prev) => prev + ARTICLES_PER_PAGE);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const clearFilters = () => {
    setSelectedSource(undefined);
    setSelectedTopicIds([]);
    setDateFrom("");
    setDateTo("");
    setOffset(0);
  };

  const toggleTopicFilter = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
    setOffset(0);
  };

  const hasActiveFilters =
    selectedSource || selectedTopicIds.length > 0 || dateFrom || dateTo;
  const hasQuery = debouncedQuery.length > 0;

  return (
    <Page>
      <div className="space-y-6">
        <AppBreadcrumb
          items={[
            { label: "Home", href: "/", icon: Home },
            { label: "Search", icon: Search },
          ]}
        />

        <PageTitle
          title="Search Articles"
          description="Search across all your monitored topics"
        />

        {/* Search Input */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search articles by title, content, or summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-10 h-12 text-base"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Source Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                {selectedSource || "All Sources"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => setSelectedSource(undefined)}>
                {!selectedSource && "✓ "}All Sources
              </DropdownMenuItem>
              {sources.map((source) => (
                <DropdownMenuItem
                  key={source}
                  onClick={() => {
                    setSelectedSource(source);
                    setOffset(0);
                  }}
                >
                  {selectedSource === source && "✓ "}
                  {source}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Topic Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Newspaper className="w-4 h-4" />
                {selectedTopicIds.length > 0
                  ? `${selectedTopicIds.length} Topic${selectedTopicIds.length > 1 ? "s" : ""}`
                  : "All Topics"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTopicIds([]);
                  setOffset(0);
                }}
              >
                {selectedTopicIds.length === 0 && "✓ "}All Topics
              </DropdownMenuItem>
              {topics.map((topic) => (
                <DropdownMenuItem
                  key={topic.id}
                  onClick={() => toggleTopicFilter(topic.id)}
                >
                  {selectedTopicIds.includes(topic.id) && "✓ "}
                  {topic.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date From Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setOffset(0);
              }}
              className="w-auto h-9"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setOffset(0);
              }}
              className="w-auto h-9"
            />
          </div>

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

          {/* Save Search Button */}
          {hasQuery && (
            <SaveSearchDialog
              searchParams={{
                query: debouncedQuery,
                topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
                source: selectedSource,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
              }}
            />
          )}

          {/* Link to Saved Searches */}
          <Link to="/saved-searches">
            <Button variant="ghost" size="sm" className="gap-2">
              <Bookmark className="w-4 h-4" />
              Saved Searches
            </Button>
          </Link>
        </div>

        {/* Results */}
        <section className="space-y-6" aria-labelledby="search-results-heading">
          {!hasQuery ? (
            <EmptyState
              icon={<Search className="h-10 w-10 text-primary/60" />}
              title="Start searching"
              description="Enter a search term to find articles across all your monitored topics."
            />
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">
                Found {totalCount} article{totalCount !== 1 ? "s" : ""} matching
                "{debouncedQuery}"
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
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
                Showing {Math.min(offset + articles.length, totalCount)} of{" "}
                {totalCount} articles
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Search className="h-10 w-10 text-primary/60" />}
              title="No articles found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters or search query."
                  : `No articles matching "${debouncedQuery}" were found.`
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
