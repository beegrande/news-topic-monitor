import { createFileRoute, Link } from "@tanstack/react-router";
import { useCollectionById, useRemoveTopicFromCollection } from "~/hooks/useCollections";
import { EditCollectionDialog } from "~/components/EditCollectionDialog";
import { TopicCard } from "~/components/TopicCard";
import {
  ArrowLeft,
  FolderOpen,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useState } from "react";
import type { Topic } from "~/db/schema";

export const Route = createFileRoute("/collections/$id/")({
  component: CollectionDetailPage,
});

function CollectionDetailPage() {
  const { id } = Route.useParams();
  const { data: collection, isLoading, error } = useCollectionById(id);
  const removeTopicMutation = useRemoveTopicFromCollection();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const handleRemoveTopic = () => {
    if (selectedTopic && collection) {
      removeTopicMutation.mutate(
        { collectionId: collection.id, topicId: selectedTopic.id },
        {
          onSuccess: () => {
            setSelectedTopic(null);
            setRemoveDialogOpen(false);
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold mb-3">Collection not found</h3>
            <p className="text-muted-foreground mb-8">
              The collection you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button asChild>
              <Link to="/collections">Back to Collections</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/collections">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Collections
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: collection.color || "#3B82F6" }}
              />
              <h1 className="text-3xl font-bold">{collection.name}</h1>
              <Badge variant="outline">
                {collection.topicCount} topic{collection.topicCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            {collection.description && (
              <p className="text-muted-foreground mt-2">{collection.description}</p>
            )}
          </div>
          <EditCollectionDialog
            collection={collection}
            trigger={
              <Button variant="outline" className="gap-2">
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
            }
          />
        </div>

        {/* Topics Grid */}
        {collection.topics && collection.topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collection.topics.map((topic) => (
              <div key={topic.id} className="relative group">
                <TopicCard
                  topic={{ ...topic, articleCount: 0 }}
                  onDelete={() => {
                    setSelectedTopic(topic);
                    setRemoveDialogOpen(true);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    setSelectedTopic(topic);
                    setRemoveDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center mx-auto mb-8">
              <FolderOpen className="w-16 h-16 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No Topics Yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Add topics to this collection from the Topics page using the "Add to Collection" option.
            </p>
            <Button asChild>
              <Link to="/topics">
                <Plus className="w-4 h-4 mr-2" />
                Go to Topics
              </Link>
            </Button>
          </div>
        )}

        {/* Remove Topic Dialog */}
        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Topic from Collection</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove "{selectedTopic?.name}" from this collection?
                The topic itself will not be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRemoveDialogOpen(false)}
                disabled={removeTopicMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveTopic}
                disabled={removeTopicMutation.isPending}
              >
                {removeTopicMutation.isPending ? "Removing..." : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
