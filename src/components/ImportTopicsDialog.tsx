import { useState, useRef } from "react";
import { useImportTopics } from "~/hooks/useTopics";
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
import { Upload, Loader2, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseTopicImportFile, type ExportTopicConfig } from "~/utils/topic-export";

interface ImportTopicsDialogProps {
  trigger?: React.ReactNode;
}

export function ImportTopicsDialog({ trigger }: ImportTopicsDialogProps) {
  const [open, setOpen] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [parsedTopics, setParsedTopics] = useState<ExportTopicConfig[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportTopics();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setParsedTopics(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseTopicImportFile(content);

      if (result.valid && result.topics) {
        setParsedTopics(result.topics);
      } else {
        setParseError(result.error || "Failed to parse file");
      }
    };
    reader.onerror = () => {
      setParseError("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsedTopics) return;

    importMutation.mutate(
      { topics: parsedTopics, skipDuplicates },
      {
        onSuccess: () => {
          setOpen(false);
          resetState();
        },
      }
    );
  };

  const resetState = () => {
    setParsedTopics(null);
    setParseError(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Topics</DialogTitle>
          <DialogDescription>
            Import topic configurations from a previously exported JSON file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
            id="topic-import-file"
          />

          {!parsedTopics && !parseError && (
            <label
              htmlFor="topic-import-file"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select a JSON file
                </p>
              </div>
            </label>
          )}

          {parseError && (
            <div className="flex items-start gap-3 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Invalid file</p>
                <p className="text-sm text-muted-foreground">{parseError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2"
                >
                  Try another file
                </Button>
              </div>
            </div>
          )}

          {parsedTopics && (
            <>
              <div className="flex items-start gap-3 p-4 border border-green-500/50 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{fileName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Found {parsedTopics.length} topic{parsedTopics.length !== 1 ? "s" : ""} to import
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0"
                >
                  Change
                </Button>
              </div>

              <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Topics to import:</p>
                <ul className="space-y-1">
                  {parsedTopics.map((topic, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {topic.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skip-duplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                />
                <Label htmlFor="skip-duplicates" className="text-sm font-normal">
                  Skip topics with duplicate names
                </Label>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedTopics || importMutation.isPending}
            className="flex-1 gap-2"
          >
            {importMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Import {parsedTopics?.length || 0} Topic{(parsedTopics?.length ?? 0) !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
