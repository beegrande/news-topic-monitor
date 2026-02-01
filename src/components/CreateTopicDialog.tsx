import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useCreateTopic, useAvailableParentTopics } from "~/hooks/useTopics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { AdvancedQueryBuilder } from "~/components/AdvancedQueryBuilder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface CreateTopicFormData {
  name: string;
  description: string;
  keywords: string;
  includedSources: string;
  excludedSources: string;
  parentId: string | null;
}

interface CreateTopicDialogProps {
  onTopicCreated?: (topicId: string, topicName: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialValues?: Partial<CreateTopicFormData>;
  defaultParentId?: string;
}

export function CreateTopicDialog({
  onTopicCreated,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  initialValues,
  defaultParentId,
}: CreateTopicDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const createTopicMutation = useCreateTopic();
  const { data: availableParents = [] } = useAvailableParentTopics();

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTopicFormData>({
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      keywords: initialValues?.keywords || "",
      includedSources: initialValues?.includedSources || "",
      excludedSources: initialValues?.excludedSources || "",
      parentId: defaultParentId || null,
    },
  });

  // Reset form when initialValues change (for template selection)
  useEffect(() => {
    if (initialValues) {
      reset({
        name: initialValues.name || "",
        description: initialValues.description || "",
        keywords: initialValues.keywords || "",
        includedSources: initialValues.includedSources || "",
        excludedSources: initialValues.excludedSources || "",
        parentId: defaultParentId || null,
      });
    }
  }, [initialValues, reset, defaultParentId]);

  const onSubmit = (data: CreateTopicFormData) => {
    createTopicMutation.mutate(
      {
        ...data,
        includedSources: data.includedSources || undefined,
        excludedSources: data.excludedSources || undefined,
        parentId: data.parentId || null,
      },
      {
        onSuccess: (newTopic) => {
          onTopicCreated?.(newTopic.id, newTopic.name);
          setOpen(false);
          reset();
        },
      }
    );
  };

  // Build hierarchy labels for dropdown display
  const getTopicLabel = (topicId: string): string => {
    const topic = availableParents.find(t => t.id === topicId);
    if (!topic) return "";

    const parts: string[] = [topic.name];
    let currentParentId = topic.parentId;

    while (currentParentId) {
      const parent = availableParents.find(t => t.id === currentParentId);
      if (parent) {
        parts.unshift(parent.name);
        currentParentId = parent.parentId;
      } else {
        break;
      }
    }

    return parts.join(" > ");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !controlledOpen && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Topic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., AI Technology News"
              {...register("name", {
                required: "Topic name is required",
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

          <Controller
            name="keywords"
            control={control}
            rules={{ required: "At least one keyword is required" }}
            render={({ field }) => (
              <AdvancedQueryBuilder
                value={field.value}
                onChange={field.onChange}
                error={errors.keywords?.message}
              />
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe what this topic monitors..."
              rows={3}
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

          <div className="space-y-2">
            <Label htmlFor="includedSources">
              Include Only Sources (Optional)
            </Label>
            <Input
              id="includedSources"
              placeholder="e.g., BBC News, Reuters, CNN"
              {...register("includedSources")}
            />
            <p className="text-xs text-muted-foreground">
              Only fetch articles from these sources. Leave empty for all
              sources.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excludedSources">Exclude Sources (Optional)</Label>
            <Input
              id="excludedSources"
              placeholder="e.g., Tabloid News, Spam Source"
              {...register("excludedSources")}
            />
            <p className="text-xs text-muted-foreground">
              Never fetch articles from these sources.
            </p>
          </div>

          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Topic (Optional)</Label>
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No parent (root topic)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (root topic)</SelectItem>
                    {availableParents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        <span className="flex items-center gap-1 text-sm">
                          {getTopicLabel(parent.id)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Organize topics hierarchically (e.g., Technology &gt; AI &gt; Machine Learning)
                </p>
              </div>
            )}
          />

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
              disabled={isSubmitting || createTopicMutation.isPending}
              className="flex-1"
            >
              {isSubmitting || createTopicMutation.isPending
                ? "Creating..."
                : "Create Topic"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
