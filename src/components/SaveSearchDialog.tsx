import { useState } from "react";
import { useForm } from "react-hook-form";
import { useCreateSavedSearch } from "~/hooks/useSavedSearches";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Bookmark } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

interface SaveSearchFormData {
  name: string;
  description: string;
}

export interface SearchParams {
  query: string;
  topicIds?: string[];
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface SaveSearchDialogProps {
  searchParams: SearchParams;
  onSearchSaved?: (id: string, name: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export function SaveSearchDialog({
  searchParams,
  onSearchSaved,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  disabled = false,
}: SaveSearchDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const createSavedSearchMutation = useCreateSavedSearch();

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SaveSearchFormData>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: SaveSearchFormData) => {
    // Determine date range type based on dates
    let dateRangeType: string | undefined;
    if (searchParams.dateFrom || searchParams.dateTo) {
      dateRangeType = "custom";
    }

    createSavedSearchMutation.mutate(
      {
        name: data.name,
        description: data.description || undefined,
        query: searchParams.query,
        topicIds: searchParams.topicIds?.length
          ? JSON.stringify(searchParams.topicIds)
          : undefined,
        source: searchParams.source,
        dateRangeType,
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
      },
      {
        onSuccess: (newSavedSearch) => {
          onSearchSaved?.(newSavedSearch.id, newSavedSearch.name);
          setOpen(false);
          reset();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !controlledOpen && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            <Bookmark className="w-4 h-4 mr-2" />
            Save Search
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Search</DialogTitle>
          <DialogDescription>
            Save this search for quick access later. Your current filters will be preserved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Search preview */}
          <div className="bg-muted/50 rounded-md p-3 space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Query:</span>{" "}
              <span className="font-mono">"{searchParams.query}"</span>
            </div>
            {searchParams.topicIds && searchParams.topicIds.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {searchParams.topicIds.length} topic
                {searchParams.topicIds.length !== 1 ? "s" : ""} selected
              </div>
            )}
            {searchParams.source && (
              <div className="text-sm text-muted-foreground">
                Source: {searchParams.source}
              </div>
            )}
            {(searchParams.dateFrom || searchParams.dateTo) && (
              <div className="text-sm text-muted-foreground">
                Date range:{" "}
                {searchParams.dateFrom || "Start"} to {searchParams.dateTo || "End"}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Tech News This Week"
              {...register("name", {
                required: "Name is required",
                minLength: {
                  value: 2,
                  message: "Name must be at least 2 characters",
                },
                maxLength: {
                  value: 100,
                  message: "Name must be less than 100 characters",
                },
              })}
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe what this search is for..."
              rows={2}
              {...register("description", {
                maxLength: {
                  value: 500,
                  message: "Description must be less than 500 characters",
                },
              })}
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createSavedSearchMutation.isPending}
              className="flex-1"
            >
              {isSubmitting || createSavedSearchMutation.isPending
                ? "Saving..."
                : "Save Search"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
