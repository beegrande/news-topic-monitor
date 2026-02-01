import { useState } from "react";
import { Copy, Globe, Link, Users, X } from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  useToggleTopicPublic,
  useGenerateShareLink,
  useRevokeShareLink,
  useTopicCollaborators,
  useRemoveCollaborator,
} from "~/hooks/useTopics";
import type { Topic } from "~/db/schema";

interface ShareTopicDialogProps {
  topic: Topic;
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function ShareTopicDialog({ topic, trigger, onOpenChange }: ShareTopicDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // If no trigger is provided, default to open (controlled externally)
  const isControlled = !trigger;
  const open = isControlled ? true : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const togglePublicMutation = useToggleTopicPublic();
  const generateLinkMutation = useGenerateShareLink();
  const revokeLinkMutation = useRevokeShareLink();
  const removeCollaboratorMutation = useRemoveCollaborator();

  const { data: collaborators = [] } = useTopicCollaborators(topic.id, open);

  const shareUrl = topic.shareToken
    ? `${window.location.origin}/shared/${topic.shareToken}`
    : null;

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  };

  const handleTogglePublic = () => {
    togglePublicMutation.mutate({ id: topic.id, isPublic: !topic.isPublic });
  };

  const handleGenerateLink = () => {
    generateLinkMutation.mutate(topic.id);
  };

  const handleRevokeLink = () => {
    revokeLinkMutation.mutate(topic.id);
  };

  const handleRemoveCollaborator = (userId: string) => {
    removeCollaboratorMutation.mutate({ topicId: topic.id, userId });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Users className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share "{topic.name}"</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <Link className="w-4 h-4 mr-2" />
              Link
            </TabsTrigger>
            <TabsTrigger value="collaborators">
              <Users className="w-4 h-4 mr-2" />
              People
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="public-toggle">Make public</Label>
              </div>
              <Switch
                id="public-toggle"
                checked={topic.isPublic}
                onCheckedChange={handleTogglePublic}
                disabled={togglePublicMutation.isPending}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {topic.isPublic
                ? "Anyone can find and view this topic"
                : "Only you and collaborators can view this topic"}
            </p>

            <div className="border-t pt-4">
              <Label>Share link</Label>
              {shareUrl ? (
                <div className="flex gap-2 mt-2">
                  <Input value={shareUrl} readOnly className="flex-1" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  No share link generated yet
                </p>
              )}
              <div className="flex gap-2 mt-3">
                {!shareUrl ? (
                  <Button
                    variant="outline"
                    onClick={handleGenerateLink}
                    disabled={generateLinkMutation.isPending}
                    className="flex-1"
                  >
                    Generate link
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleGenerateLink}
                      disabled={generateLinkMutation.isPending}
                      className="flex-1"
                    >
                      Regenerate
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRevokeLink}
                      disabled={revokeLinkMutation.isPending}
                      className="flex-1"
                    >
                      Revoke
                    </Button>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="collaborators" className="space-y-4 mt-4">
            {collaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No collaborators yet. Share a link to invite people.
              </p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-2 rounded-md border"
                  >
                    <div>
                      <p className="font-medium text-sm">{collab.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {collab.userEmail} - {collab.permission}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCollaborator(collab.userId)}
                      disabled={removeCollaboratorMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
