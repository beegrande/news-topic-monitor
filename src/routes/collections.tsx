import { createFileRoute, Link } from "@tanstack/react-router";
import { CreateCollectionDialog } from "~/components/CreateCollectionDialog";
import { EditCollectionDialog } from "~/components/EditCollectionDialog";
import { CollectionCard } from "~/components/CollectionCard";
import { useCollections, useDeleteCollection } from "~/hooks/useCollections";
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
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
import type { Collection } from "~/db/schema";
import type { CollectionWithTopicCount } from "~/data-access/collections";

export const Route = createFileRoute("/collections")({
  component: CollectionsPage,
});

type SortOption = "name" | "created" | "topics";

function CollectionsPage() {
  const [selectedCollection, setSelectedCollection] = useState<CollectionWithTopicCount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("created");

  const { data: allCollections = [], isLoading, error } = useCollections();
  const deleteCollectionMutation = useDeleteCollection();

  const collections = useMemo(() => {
    let filtered = allCollections;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (collection) =>
          collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          collection.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered = filtered.slice().sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "topics":
          return (b.topicCount || 0) - (a.topicCount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allCollections, searchQuery, sortBy]);

  const handleDeleteCollection = () => {
    if (selectedCollection) {
      deleteCollectionMutation.mutate(selectedCollection.id, {
        onSuccess: () => {
          setSelectedCollection(null);
          setDeleteDialogOpen(false);
        },
      });
    }
  };

  const handleEditClick = (collection: CollectionWithTopicCount) => {
    setSelectedCollection(collection);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    const collection = allCollections.find((c) => c.id === id);
    if (collection) {
      setSelectedCollection(collection);
      setDeleteDialogOpen(true);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Collections</h1>
            <p className="text-muted-foreground mt-2">
              Group related topics into collections for better organization
            </p>
          </div>
          <CreateCollectionDialog
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Collection
              </Button>
            }
          />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-destructive">
              Error loading collections: {(error as Error).message}
            </p>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search collections..."
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
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    {sortBy === "name" && "✓ "} Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("topics")}>
                    {sortBy === "topics" && "✓ "} Topic Count
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Collections Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-muted rounded mb-3 w-3/4"></div>
                <div className="h-4 bg-muted rounded mb-2 w-full"></div>
                <div className="h-4 bg-muted rounded mb-4 w-2/3"></div>
              </div>
            ))}
          </div>
        ) : collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center mx-auto mb-8">
              <FolderOpen className="w-16 h-16 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Create Your First Collection</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
              Organize your topics into collections like "Industry News" or "Competitor Tracking".
            </p>

            <CreateCollectionDialog
              trigger={
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create Your First Collection
                </Button>
              }
            />
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Collection</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedCollection?.name}"? Topics in this
                collection will not be deleted, but they will be removed from the collection.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteCollectionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCollection}
                disabled={deleteCollectionMutation.isPending}
              >
                {deleteCollectionMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Collection Dialog */}
        {selectedCollection && (
          <EditCollectionDialog
            collection={selectedCollection}
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open) setSelectedCollection(null);
            }}
            onCollectionUpdated={() => {
              setEditDialogOpen(false);
              setSelectedCollection(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
