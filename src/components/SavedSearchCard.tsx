import type { SavedSearch } from "~/db/schema";
import {
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Filter,
  Calendar,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatRelativeTime } from "~/utils/date";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface SavedSearchCardProps {
  savedSearch: SavedSearch;
  onEdit?: (savedSearch: SavedSearch) => void;
  onDelete?: (id: string) => void;
  onRun?: (savedSearch: SavedSearch) => void;
}

export function SavedSearchCard({
  savedSearch,
  onEdit,
  onDelete,
  onRun,
}: SavedSearchCardProps) {
  // Count active filters
  const topicIds = savedSearch.topicIds ? JSON.parse(savedSearch.topicIds) : [];
  const hasFilters =
    topicIds.length > 0 ||
    savedSearch.source ||
    savedSearch.dateRangeType ||
    savedSearch.dateFrom ||
    savedSearch.dateTo;

  return (
    <Card className="group hover:shadow-lg hover:border-border/60 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Search className="w-4 h-4 text-primary" />
              {hasFilters && (
                <Badge variant="outline" className="text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  Filters
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {savedSearch.name}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRun?.(savedSearch)}>
                <Play className="h-4 w-4 mr-2" />
                Run Search
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(savedSearch)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete?.(savedSearch.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {savedSearch.description && (
          <CardDescription className="line-clamp-2 mt-1">
            {savedSearch.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Query preview */}
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-sm font-mono text-muted-foreground line-clamp-1">
              "{savedSearch.query}"
            </p>
          </div>

          {/* Filter summary */}
          <div className="flex flex-wrap gap-1.5">
            {topicIds.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {topicIds.length} topic{topicIds.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {savedSearch.source && (
              <Badge variant="secondary" className="text-xs">
                {savedSearch.source}
              </Badge>
            )}
            {savedSearch.dateRangeType && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {savedSearch.dateRangeType === "last7days"
                  ? "Last 7 days"
                  : savedSearch.dateRangeType === "last30days"
                    ? "Last 30 days"
                    : savedSearch.dateRangeType === "last90days"
                      ? "Last 90 days"
                      : "Custom range"}
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onRun?.(savedSearch)}
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
            <time dateTime={new Date(savedSearch.updatedAt).toISOString()}>
              Updated {formatRelativeTime(new Date(savedSearch.updatedAt).toISOString())}
            </time>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SavedSearchCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
          <div className="w-16 h-5 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-3/4 h-6 bg-muted rounded animate-pulse" />
        <div className="w-full h-4 bg-muted rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent>
        <div className="w-full h-10 bg-muted rounded animate-pulse" />
        <div className="flex gap-1.5 mt-3">
          <div className="w-16 h-5 bg-muted rounded animate-pulse" />
          <div className="w-20 h-5 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex justify-between mt-3 pt-2 border-t">
          <div className="w-12 h-6 bg-muted rounded animate-pulse" />
          <div className="w-24 h-4 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
