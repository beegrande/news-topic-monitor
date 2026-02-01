import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useUpdateSavedSearch } from "~/hooks/useSavedSearches";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Pencil } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { SavedSearch } from "~/db/schema";

interface EditSavedSearchFormData {
  name: string;
  description: string;
}

interface EditSavedSearchDialogProps {
  savedSearch: SavedSearch;
  onSavedSearchUpdated?: (savedSearch: SavedSearch) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditSavedSearchDialog({
  savedSearch,
  onSavedSearchUpdated,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: EditSavedSearchDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const updateSavedSearchMutation = useUpdateSavedSearch();

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditSavedSearchFormData>({
    defaultValues: {
      name: savedSearch.name,
      description: savedSearch.description || "",
    },
  });

  useEffect(() => {
    reset({
      name: savedSearch.name,
      description: savedSearch.description || "",
    });
  }, [savedSearch, reset]);

  const onSubmit = (data: EditSavedSearchFormData) => {
    updateSavedSearchMutation.mutate(
      {
        id: savedSearch.id,
        name: data.name,
        description: data.description || undefined,
      },
      {
        onSuccess: (updatedSavedSearch) => {
          onSavedSearchUpdated?.(updatedSavedSearch);
          setOpen(false);
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
            <Pencil className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Saved Search</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Search preview (read-only) */}
          <div className="bg-muted/50 rounded-md p-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Query:</span>{" "}
              <span className="font-mono">"{savedSearch.query}"</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
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
            <Label htmlFor="edit-description">Description (Optional)</Label>
            <Textarea
              id="edit-description"
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
              disabled={isSubmitting || updateSavedSearchMutation.isPending}
              className="flex-1"
            >
              {isSubmitting || updateSavedSearchMutation.isPending
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
