import { useState } from "react";
import { useExportTopics, useTopics } from "~/hooks/useTopics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { downloadTopicExport } from "~/utils/topic-export";

interface ExportTopicsDialogProps {
  trigger?: React.ReactNode;
}

export function ExportTopicsDialog({ trigger }: ExportTopicsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [exportAll, setExportAll] = useState(true);

  const { data: topics = [] } = useTopics();
  const exportMutation = useExportTopics();

  const handleToggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTopicIds.size === topics.length) {
      setSelectedTopicIds(new Set());
    } else {
      setSelectedTopicIds(new Set(topics.map((t) => t.id)));
    }
  };

  const handleExport = async () => {
    const topicIds = exportAll ? undefined : Array.from(selectedTopicIds);

    exportMutation.mutate(topicIds, {
      onSuccess: (exportedTopics) => {
        downloadTopicExport(exportedTopics);
        setOpen(false);
      },
    });
  };

  const canExport = exportAll || selectedTopicIds.size > 0;
  const exportCount = exportAll ? topics.length : selectedTopicIds.size;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Topics</DialogTitle>
          <DialogDescription>
            Export topic configurations as a JSON file. Useful for backup, sharing, or migration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="export-all"
              checked={exportAll}
              onCheckedChange={(checked) => setExportAll(checked === true)}
            />
            <Label htmlFor="export-all" className="text-sm font-medium">
              Export all topics ({topics.length})
            </Label>
          </div>

          {!exportAll && (
            <div className="border rounded-md p-3 max-h-64 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-sm text-muted-foreground">
                  Select topics to export
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-auto py-1 px-2 text-xs"
                >
                  {selectedTopicIds.size === topics.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              {topics.map((topic) => (
                <div key={topic.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`topic-${topic.id}`}
                    checked={selectedTopicIds.has(topic.id)}
                    onCheckedChange={() => handleToggleTopic(topic.id)}
                  />
                  <Label
                    htmlFor={`topic-${topic.id}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {topic.name}
                  </Label>
                </div>
              ))}
              {topics.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No topics to export
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            The export includes topic name, description, keywords, monitoring settings, and notification preferences.
            User-specific data like articles and sharing settings are not included.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport || exportMutation.isPending}
            className="flex-1 gap-2"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export {exportCount} Topic{exportCount !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
