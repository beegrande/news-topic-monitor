import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useUpdateTopic, useAvailableParentTopics } from "~/hooks/useTopics";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { TopicNotificationSettings } from "~/components/TopicNotificationSettings";
import { TopicScheduleSettings } from "~/components/TopicScheduleSettings";
import { AdvancedQueryBuilder } from "~/components/AdvancedQueryBuilder";
import type { Topic, NotificationFrequency } from "~/db/schema";

interface EditTopicFormData {
  name: string;
  description: string;
  keywords: string;
  monitoringFrequency: "hourly" | "daily" | "weekly";
  status: "active" | "paused" | "archived";
  includedSources: string;
  excludedSources: string;
  notificationEnabled: boolean;
  notificationFrequency: NotificationFrequency;
  minimumRelevanceScore: number;
  parentId: string | null;
  // Schedule settings
  scheduleEnabled: boolean;
  scheduleDays: string | null;
  scheduleStartHour: number | null;
  scheduleEndHour: number | null;
  scheduleTimezone: string | null;
}

interface EditTopicDialogProps {
  topic: Topic;
  onTopicUpdated?: (topic: Topic) => void;
  trigger?: React.ReactNode;
}

export function EditTopicDialog({
  topic,
  onTopicUpdated,
  trigger,
}: EditTopicDialogProps) {
  const [open, setOpen] = useState(false);
  const updateTopicMutation = useUpdateTopic();
  const { data: availableParents = [] } = useAvailableParentTopics(topic.id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditTopicFormData>({
    defaultValues: {
      name: topic.name,
      description: topic.description || "",
      keywords: topic.keywords,
      monitoringFrequency: topic.monitoringFrequency as "hourly" | "daily" | "weekly",
      status: topic.status as "active" | "paused" | "archived",
      includedSources: topic.includedSources || "",
      excludedSources: topic.excludedSources || "",
      notificationEnabled: topic.notificationEnabled,
      notificationFrequency: topic.notificationFrequency as NotificationFrequency,
      minimumRelevanceScore: topic.minimumRelevanceScore,
      parentId: topic.parentId || null,
      scheduleEnabled: topic.scheduleEnabled,
      scheduleDays: topic.scheduleDays || null,
      scheduleStartHour: topic.scheduleStartHour ?? null,
      scheduleEndHour: topic.scheduleEndHour ?? null,
      scheduleTimezone: topic.scheduleTimezone || "UTC",
    },
  });

  // Reset form when topic changes
  useEffect(() => {
    reset({
      name: topic.name,
      description: topic.description || "",
      keywords: topic.keywords,
      monitoringFrequency: topic.monitoringFrequency as "hourly" | "daily" | "weekly",
      status: topic.status as "active" | "paused" | "archived",
      includedSources: topic.includedSources || "",
      excludedSources: topic.excludedSources || "",
      notificationEnabled: topic.notificationEnabled,
      notificationFrequency: topic.notificationFrequency as NotificationFrequency,
      minimumRelevanceScore: topic.minimumRelevanceScore,
      parentId: topic.parentId || null,
      scheduleEnabled: topic.scheduleEnabled,
      scheduleDays: topic.scheduleDays || null,
      scheduleStartHour: topic.scheduleStartHour ?? null,
      scheduleEndHour: topic.scheduleEndHour ?? null,
      scheduleTimezone: topic.scheduleTimezone || "UTC",
    });
  }, [topic, reset]);

  const onSubmit = (data: EditTopicFormData) => {
    updateTopicMutation.mutate(
      {
        id: topic.id,
        ...data,
        includedSources: data.includedSources || null,
        excludedSources: data.excludedSources || null,
        parentId: data.parentId,
      },
      {
        onSuccess: (updatedTopic) => {
          onTopicUpdated?.(updatedTopic);
          setOpen(false);
        },
      }
    );
  };

  const monitoringFrequency = watch("monitoringFrequency");
  const status = watch("status");
  const notificationEnabled = watch("notificationEnabled");
  const notificationFrequency = watch("notificationFrequency");
  const minimumRelevanceScore = watch("minimumRelevanceScore");
  const parentId = watch("parentId");
  const scheduleEnabled = watch("scheduleEnabled");
  const scheduleDays = watch("scheduleDays");
  const scheduleStartHour = watch("scheduleStartHour");
  const scheduleEndHour = watch("scheduleEndHour");
  const scheduleTimezone = watch("scheduleTimezone");

  // Build hierarchy labels for dropdown display
  const getTopicLabel = (topicId: string): string => {
    const t = availableParents.find(p => p.id === topicId);
    if (!t) return "";

    const parts: string[] = [t.name];
    let currentParentId = t.parentId;

    while (currentParentId) {
      const parent = availableParents.find(p => p.id === currentParentId);
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
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Pencil className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Topic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
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
            <Label htmlFor="edit-description">Description (Optional)</Label>
            <Textarea
              id="edit-description"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monitoring Frequency</Label>
              <Select
                value={monitoringFrequency}
                onValueChange={(value: "hourly" | "daily" | "weekly") =>
                  setValue("monitoringFrequency", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value: "active" | "paused" | "archived") =>
                  setValue("status", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-includedSources">
              Include Only Sources (Optional)
            </Label>
            <Input
              id="edit-includedSources"
              placeholder="e.g., BBC News, Reuters, CNN"
              {...register("includedSources")}
            />
            <p className="text-xs text-muted-foreground">
              Only fetch articles from these sources. Leave empty for all
              sources.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-excludedSources">
              Exclude Sources (Optional)
            </Label>
            <Input
              id="edit-excludedSources"
              placeholder="e.g., Tabloid News, Spam Source"
              {...register("excludedSources")}
            />
            <p className="text-xs text-muted-foreground">
              Never fetch articles from these sources.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Parent Topic (Optional)</Label>
            <Select
              value={parentId || "none"}
              onValueChange={(value) => setValue("parentId", value === "none" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No parent (root topic)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (root topic)</SelectItem>
                {availableParents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {getTopicLabel(parent.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Organize topics hierarchically (e.g., Technology &gt; AI &gt; Machine Learning)
            </p>
          </div>

          <TopicNotificationSettings
            notificationEnabled={notificationEnabled}
            notificationFrequency={notificationFrequency}
            minimumRelevanceScore={minimumRelevanceScore}
            onNotificationEnabledChange={(enabled) =>
              setValue("notificationEnabled", enabled)
            }
            onNotificationFrequencyChange={(frequency) =>
              setValue("notificationFrequency", frequency)
            }
            onMinimumRelevanceScoreChange={(score) =>
              setValue("minimumRelevanceScore", score)
            }
          />

          <TopicScheduleSettings
            scheduleEnabled={scheduleEnabled}
            scheduleDays={scheduleDays}
            scheduleStartHour={scheduleStartHour}
            scheduleEndHour={scheduleEndHour}
            scheduleTimezone={scheduleTimezone}
            onScheduleEnabledChange={(enabled) =>
              setValue("scheduleEnabled", enabled)
            }
            onScheduleDaysChange={(days) =>
              setValue("scheduleDays", days)
            }
            onScheduleStartHourChange={(hour) =>
              setValue("scheduleStartHour", hour)
            }
            onScheduleEndHourChange={(hour) =>
              setValue("scheduleEndHour", hour)
            }
            onScheduleTimezoneChange={(tz) =>
              setValue("scheduleTimezone", tz)
            }
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
              disabled={isSubmitting || updateTopicMutation.isPending}
              className="flex-1"
            >
              {isSubmitting || updateTopicMutation.isPending
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
