import type { TopicWithArticleCount } from "~/data-access/topics";
import {
  Newspaper,
  MoreVertical,
  Play,
  Pause,
  Archive,
  Pencil,
  Trash2,
  Clock,
  AlertTriangle,
  Share2,
  Globe,
} from "lucide-react";
import { formatRelativeTime } from "~/utils/date";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Tooltip } from "~/components/ui/tooltip";

interface TopicCardProps {
  topic: TopicWithArticleCount;
  onStatusChange?: (id: string, status: "active" | "paused" | "archived") => void;
  onEdit?: (topic: TopicWithArticleCount) => void;
  onDelete?: (id: string) => void;
  onShare?: (topic: TopicWithArticleCount) => void;
}

const statusConfig = {
  active: {
    label: "Active",
    variant: "default" as const,
    className: "bg-green-500/90 hover:bg-green-500",
  },
  paused: {
    label: "Paused",
    variant: "secondary" as const,
    className: "bg-yellow-500/90 hover:bg-yellow-500 text-white",
  },
  archived: {
    label: "Archived",
    variant: "outline" as const,
    className: "",
  },
  error: {
    label: "Error",
    variant: "destructive" as const,
    className: "",
  },
};

const frequencyLabels: Record<string, string> = {
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
};

export function TopicCard({
  topic,
  onStatusChange,
  onEdit,
  onDelete,
  onShare,
}: TopicCardProps) {
  const hasError = topic.status === "active" && topic.lastError;
  const displayStatus = hasError ? "error" : topic.status;
  const status = statusConfig[displayStatus as keyof typeof statusConfig] || statusConfig.active;
  const keywords = topic.keywords.split(",").map((k) => k.trim()).filter(Boolean);

  return (
    <Card className="group hover:shadow-lg hover:border-border/60 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {hasError ? (
                <Tooltip content={topic.lastError || "Unknown error"}>
                  <Badge className={status.className} variant={status.variant}>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </Tooltip>
              ) : (
                <Badge className={status.className} variant={status.variant}>
                  {status.label}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {frequencyLabels[topic.monitoringFrequency] || topic.monitoringFrequency}
              </Badge>
              {topic.isPublic && (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                  <Globe className="h-3 w-3 mr-1" />
                  Public
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {topic.name}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {topic.status !== "active" && (
                <DropdownMenuItem onClick={() => onStatusChange?.(topic.id, "active")}>
                  <Play className="h-4 w-4 mr-2" />
                  Activate
                </DropdownMenuItem>
              )}
              {topic.status === "active" && (
                <DropdownMenuItem onClick={() => onStatusChange?.(topic.id, "paused")}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </DropdownMenuItem>
              )}
              {topic.status !== "archived" && (
                <DropdownMenuItem onClick={() => onStatusChange?.(topic.id, "archived")}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onShare?.(topic)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(topic)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete?.(topic.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {topic.description && (
          <CardDescription className="line-clamp-2 mt-1">
            {topic.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {keywords.slice(0, 5).map((keyword, index) => (
            <Badge key={index} variant="secondary" className="text-xs font-normal">
              {keyword}
            </Badge>
          ))}
          {keywords.length > 5 && (
            <Badge variant="secondary" className="text-xs font-normal">
              +{keywords.length - 5} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <Newspaper className="h-4 w-4" />
            <span>{topic.articleCount} article{topic.articleCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {topic.lastCheckedAt
                ? `Checked ${formatRelativeTime(new Date(topic.lastCheckedAt).toISOString())}`
                : "Never checked"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
