import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EditSavedSearchDialog } from "~/components/EditSavedSearchDialog";
import { SavedSearchCard, SavedSearchCardSkeleton } from "~/components/SavedSearchCard";
import { useSavedSearches, useDeleteSavedSearch } from "~/hooks/useSavedSearches";
import {
  Bookmark,
  Search,
  Filter,
  Home,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useState, useMemo } from "react";
import type { SavedSearch } from "~/db/schema";
import { Page } from "~/components/Page";
import { PageTitle } from "~/components/PageTitle";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { EmptyState } from "~/components/EmptyState";

export const Route = createFileRoute("/saved-searches")({
  component: SavedSearchesPage,
});

type SortOption = "name" | "created" | "updated";

function SavedSearchesPage() {
  const navigate = useNavigate();
  const [selectedSavedSearch, setSelectedSavedSearch] = useState<SavedSearch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("created");

  const { data: allSavedSearches = [], isLoading, error } = useSavedSearches();
  const deleteSavedSearchMutation = useDeleteSavedSearch();

  const savedSearches = useMemo(() => {
    let filtered = allSavedSearches;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (savedSearch) =>
          savedSearch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          savedSearch.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          savedSearch.query.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered = filtered.slice().sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "updated":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [allSavedSearches, searchQuery, sortBy]);

  const handleDeleteSavedSearch = () => {
    if (selectedSavedSearch) {
      deleteSavedSearchMutation.mutate(selectedSavedSearch.id, {
        onSuccess: () => {
          setSelectedSavedSearch(null);
          setDeleteDialogOpen(false);
        },
      });
    }
  };

  const handleEditClick = (savedSearch: SavedSearch) => {
    setSelectedSavedSearch(savedSearch);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    const savedSearch = allSavedSearches.find((s) => s.id === id);
    if (savedSearch) {
      setSelectedSavedSearch(savedSearch);
      setDeleteDialogOpen(true);
    }
  };

  const handleRunSearch = (savedSearch: SavedSearch) => {
    // Build search URL with parameters
    const params = new URLSearchParams();
    params.set("q", savedSearch.query);

    if (savedSearch.topicIds) {
      const topicIds = JSON.parse(savedSearch.topicIds);
      topicIds.forEach((id: string) => params.append("topic", id));
    }

    if (savedSearch.source) {
      params.set("source", savedSearch.source);
    }

    if (savedSearch.dateFrom) {
      params.set("from", new Date(savedSearch.dateFrom).toISOString().split("T")[0]);
    }

    if (savedSearch.dateTo) {
      params.set("to", new Date(savedSearch.dateTo).toISOString().split("T")[0]);
    }

    navigate({ to: "/search", search: params.toString() ? `?${params.toString()}` : undefined });
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <Page>
      <div className="space-y-6">
        <AppBreadcrumb
          items={[
            { label: "Home", href: "/", icon: Home },
            { label: "Saved Searches", icon: Bookmark },
          ]}
        />

        <PageTitle
          title="Saved Searches"
          description="Quick access to your saved article search queries"
        />

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive">
              Error loading saved searches: {(error as Error).message}
            </p>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="bg-card rounded-lg border p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search saved searches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("created")}>
                    {sortBy === "created" && "✓ "} Date Created
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("updated")}>
                    {sortBy === "updated" && "✓ "} Date Updated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    {sortBy === "name" && "✓ "} Name
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Saved Searches Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SavedSearchCardSkeleton key={i} />
            ))}
          </div>
        ) : savedSearches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedSearches.map((savedSearch) => (
              <SavedSearchCard
                key={savedSearch.id}
                savedSearch={savedSearch}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onRun={handleRunSearch}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Bookmark className="h-10 w-10 text-primary/60" />}
            title="No saved searches yet"
            description="Save searches from the search page to quickly access them later. Saved searches preserve your query and all filters."
            actionLabel="Go to Search"
            onAction={() => navigate({ to: "/search" })}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Saved Search</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedSavedSearch?.name}"? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteSavedSearchMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSavedSearch}
                disabled={deleteSavedSearchMutation.isPending}
              >
                {deleteSavedSearchMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Saved Search Dialog */}
        {selectedSavedSearch && (
          <EditSavedSearchDialog
            savedSearch={selectedSavedSearch}
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open) setSelectedSavedSearch(null);
            }}
            onSavedSearchUpdated={() => {
              setEditDialogOpen(false);
              setSelectedSavedSearch(null);
            }}
          />
        )}
      </div>
    </Page>
  );
}
