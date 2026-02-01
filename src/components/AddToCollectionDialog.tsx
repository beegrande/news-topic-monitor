import { useState } from "react";
import { useCollections, useAddTopicToCollection, useCreateCollection } from "~/hooks/useCollections";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FolderPlus, Plus, Check, Loader2 } from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";

interface AddToCollectionDialogProps {
  topicId: string;
  topicName: string;
  trigger?: React.ReactNode;
  onTopicAdded?: () => void;
}

export function AddToCollectionDialog({
  topicId,
  topicName,
  trigger,
  onTopicAdded,
}: AddToCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const { data: collections = [], isLoading } = useCollections(open);
  const addToCollectionMutation = useAddTopicToCollection();
  const createCollectionMutation = useCreateCollection();

  const handleAddToCollection = (collectionId: string) => {
    addToCollectionMutation.mutate(
      { collectionId, topicId },
      {
        onSuccess: () => {
          onTopicAdded?.();
          setOpen(false);
        },
      }
    );
  };

  const handleCreateAndAdd = () => {
    if (!newCollectionName.trim()) return;

    createCollectionMutation.mutate(
      { name: newCollectionName.trim() },
      {
        onSuccess: (newCollection) => {
          addToCollectionMutation.mutate(
            { collectionId: newCollection.id, topicId },
            {
              onSuccess: () => {
                onTopicAdded?.();
                setOpen(false);
                setNewCollectionName("");
                setShowNewCollection(false);
              },
            }
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <FolderPlus className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add "{topicName}" to a collection
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : collections.length > 0 ? (
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="p-2 space-y-1">
                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => handleAddToCollection(collection.id)}
                    disabled={addToCollectionMutation.isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: collection.color || "#3B82F6" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{collection.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {collection.topicCount} topic{collection.topicCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {addToCollectionMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No collections yet</p>
            </div>
          )}

          <div className="border-t pt-4">
            {showNewCollection ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-collection">New Collection Name</Label>
                  <Input
                    id="new-collection"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="e.g., Industry News"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewCollection(false);
                      setNewCollectionName("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateAndAdd}
                    disabled={
                      !newCollectionName.trim() ||
                      createCollectionMutation.isPending ||
                      addToCollectionMutation.isPending
                    }
                    className="flex-1"
                  >
                    {createCollectionMutation.isPending || addToCollectionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Create & Add
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowNewCollection(true)}
              >
                <Plus className="w-4 h-4" />
                Create New Collection
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
