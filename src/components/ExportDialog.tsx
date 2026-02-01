import { useState } from "react";
import { Download, FileSpreadsheet, FileJson, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useExportPreview, useExportArticles } from "~/hooks/useExport";
import type { Topic, ArticleSentiment } from "~/db/schema";

interface ExportDialogProps {
  topic: Topic;
  sources?: string[];
  sentiments?: ArticleSentiment[];
  trigger?: React.ReactNode;
}

export function ExportDialog({
  topic,
  sources = [],
  sentiments = [],
  trigger,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [selectedSource, setSelectedSource] = useState<string | undefined>();
  const [selectedSentiment, setSelectedSentiment] = useState<ArticleSentiment | undefined>();

  const { data: preview, isLoading: isPreviewLoading } = useExportPreview(
    {
      topicId: topic.id,
      source: selectedSource,
      sentiment: selectedSentiment,
    },
    open
  );

  const exportMutation = useExportArticles();

  const handleExport = () => {
    exportMutation.mutate(
      {
        topicId: topic.id,
        format,
        source: selectedSource,
        sentiment: selectedSentiment,
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  };

  const clearFilters = () => {
    setSelectedSource(undefined);
    setSelectedSentiment(undefined);
  };

  const hasFilters = selectedSource || selectedSentiment;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Articles</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="flex gap-2">
              <Button
                variant={format === "csv" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setFormat("csv")}
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </Button>
              <Button
                variant={format === "json" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setFormat("json")}
              >
                <FileJson className="w-4 h-4" />
                JSON
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label>Filters (optional)</Label>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>

            {sources.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Source</Label>
                <Select
                  value={selectedSource || "all"}
                  onValueChange={(val) =>
                    setSelectedSource(val === "all" ? undefined : val)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {sources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sentiments.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sentiment</Label>
                <Select
                  value={selectedSentiment || "all"}
                  onValueChange={(val) =>
                    setSelectedSentiment(
                      val === "all" ? undefined : (val as ArticleSentiment)
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All sentiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sentiments</SelectItem>
                    {sentiments.map((sentiment) => (
                      <SelectItem key={sentiment} value={sentiment}>
                        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-md bg-muted p-3">
            {isPreviewLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading preview...
              </div>
            ) : (
              <div className="text-sm">
                <span className="font-medium">{preview?.count || 0}</span>{" "}
                <span className="text-muted-foreground">
                  article{preview?.count !== 1 ? "s" : ""} will be exported
                </span>
              </div>
            )}
          </div>

          {/* Export Button */}
          <Button
            className="w-full gap-2"
            onClick={handleExport}
            disabled={exportMutation.isPending || !preview?.count}
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {preview?.count || 0} Article{preview?.count !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
