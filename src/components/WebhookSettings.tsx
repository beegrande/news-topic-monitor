import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
} from "~/hooks/useWebhooks";
import { useTopics } from "~/hooks/useTopics";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Webhook,
  Plus,
  Trash2,
  Edit,
  Play,
  AlertCircle,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import type { WebhookWithTopic } from "~/data-access/webhooks";

const webhookFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  url: z.string().url("Must be a valid URL"),
  topicId: z.string().nullable(),
  secret: z.string().max(256).optional(),
  isEnabled: z.boolean(),
});

type WebhookFormData = z.infer<typeof webhookFormSchema>;

function WebhookCard({
  webhook,
  onEdit,
  onDelete,
  onTest,
}: {
  webhook: WebhookWithTopic;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
}) {
  const testMutation = useTestWebhook();
  const deleteMutation = useDeleteWebhook();

  const handleTest = () => {
    testMutation.mutate(webhook.id);
    onTest();
  };

  const handleDelete = () => {
    if (
      confirm(`Are you sure you want to delete the webhook "${webhook.name}"?`)
    ) {
      deleteMutation.mutate(webhook.id);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{webhook.name}</h4>
            {webhook.isEnabled ? (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded">
                <Check className="h-3 w-3" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded">
                <X className="h-3 w-3" />
                Disabled
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            {webhook.url.length > 50
              ? webhook.url.substring(0, 50) + "..."
              : webhook.url}
          </p>
          <p className="text-xs text-muted-foreground">
            {webhook.topic ? (
              <>Topic: {webhook.topic.name}</>
            ) : (
              <>All topics</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTest}
            disabled={testMutation.isPending || !webhook.isEnabled}
            title="Send test webhook"
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Edit webhook"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-700"
            title="Delete webhook"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {webhook.lastError && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Last error: {webhook.lastError}</span>
        </div>
      )}

      {webhook.lastTriggeredAt && !webhook.lastError && (
        <p className="text-xs text-muted-foreground">
          Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function WebhookFormDialog({
  open,
  onOpenChange,
  webhook,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: WebhookWithTopic | null;
}) {
  const { data: topics } = useTopics();
  const createMutation = useCreateWebhook();
  const updateMutation = useUpdateWebhook();

  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      name: webhook?.name ?? "",
      url: webhook?.url ?? "",
      topicId: webhook?.topicId ?? null,
      secret: webhook?.secret ?? "",
      isEnabled: webhook?.isEnabled ?? true,
    },
  });

  // Reset form when webhook changes
  const isEditing = !!webhook;

  const onSubmit = (data: WebhookFormData) => {
    if (isEditing && webhook) {
      updateMutation.mutate(
        {
          id: webhook.id,
          name: data.name,
          url: data.url,
          topicId: data.topicId,
          secret: data.secret || null,
          isEnabled: data.isEnabled,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          name: data.name,
          url: data.url,
          topicId: data.topicId,
          secret: data.secret || null,
          isEnabled: data.isEnabled,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Webhook" : "Create Webhook"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your webhook configuration."
              : "Configure a webhook to receive notifications when new articles match your topics."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Slack Webhook"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL *</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The URL that will receive POST requests with article data.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topicId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <Select
                    value={field.value ?? "all"}
                    onValueChange={(value) =>
                      field.onChange(value === "all" ? null : value)
                    }
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All topics</SelectItem>
                      {topics?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a specific topic or receive notifications for all
                    topics.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter a secret for HMAC signing"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    If provided, payloads will be signed with HMAC-SHA256. The
                    signature will be in the X-Webhook-Signature header.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Enabled</FormLabel>
                    <FormDescription>
                      Disable to temporarily stop receiving webhooks.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Button
                      type="button"
                      variant={field.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.onChange(!field.value)}
                      disabled={isPending}
                    >
                      {field.value ? "Enabled" : "Disabled"}
                    </Button>
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Create Webhook"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function WebhookSettings() {
  const { data: webhooks, isLoading } = useWebhooks();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookWithTopic | null>(
    null
  );

  const handleCreate = () => {
    setEditingWebhook(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (webhook: WebhookWithTopic) => {
    setEditingWebhook(webhook);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingWebhook(null);
    }
    setIsDialogOpen(open);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
            <div className="h-20 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure webhooks to receive real-time notifications when new
            articles match your topics. Integrate with Slack, Zapier, or any
            custom endpoint.
          </p>

          {webhooks && webhooks.length > 0 ? (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <WebhookCard
                  key={webhook.id}
                  webhook={webhook}
                  onEdit={() => handleEdit(webhook)}
                  onDelete={() => {}}
                  onTest={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No webhooks configured yet.</p>
              <p className="text-sm">
                Create your first webhook to start receiving notifications.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <WebhookFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        webhook={editingWebhook}
      />
    </>
  );
}
