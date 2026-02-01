import { Badge } from "~/components/ui/badge";
import { Tooltip } from "~/components/ui/tooltip";
import {
  CheckCircle2,
  Pause,
  AlertTriangle,
  Clock,
  Archive,
} from "lucide-react";
import { formatRelativeTime } from "~/utils/date";
import type { Topic } from "~/db/schema";

type MonitoringStatus = "active" | "paused" | "archived" | "error";

interface TopicMonitoringStatusProps {
  topic: Pick<Topic, "status" | "lastCheckedAt" | "lastError" | "lastErrorAt" | "monitoringFrequency">;
  showLastChecked?: boolean;
  compact?: boolean;
}

function getMonitoringStatus(topic: TopicMonitoringStatusProps["topic"]): MonitoringStatus {
  if (topic.status === "paused") return "paused";
  if (topic.status === "archived") return "archived";
  if (topic.lastError) return "error";
  return "active";
}

function getNextCheckTime(topic: TopicMonitoringStatusProps["topic"]): string | null {
  if (topic.status !== "active" || !topic.lastCheckedAt) return null;

  const lastChecked = new Date(topic.lastCheckedAt);
  const now = new Date();

  let intervalMs: number;
  switch (topic.monitoringFrequency) {
    case "hourly":
      intervalMs = 60 * 60 * 1000;
      break;
    case "daily":
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case "weekly":
      intervalMs = 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      intervalMs = 24 * 60 * 60 * 1000;
  }

  const nextCheck = new Date(lastChecked.getTime() + intervalMs);
  if (nextCheck <= now) return "Soon";

  return formatRelativeTime(nextCheck.toISOString());
}

const statusConfig: Record<
  MonitoringStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    className: string;
    badgeVariant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className: "text-green-600",
    badgeVariant: "default",
  },
  paused: {
    label: "Paused",
    icon: Pause,
    className: "text-yellow-600",
    badgeVariant: "secondary",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    className: "text-muted-foreground",
    badgeVariant: "outline",
  },
  error: {
    label: "Error",
    icon: AlertTriangle,
    className: "text-red-600",
    badgeVariant: "destructive",
  },
};

export function TopicMonitoringStatus({
  topic,
  showLastChecked = true,
  compact = false,
}: TopicMonitoringStatusProps) {
  const monitoringStatus = getMonitoringStatus(topic);
  const config = statusConfig[monitoringStatus];
  const Icon = config.icon;
  const nextCheck = getNextCheckTime(topic);

  if (compact) {
    return (
      <Tooltip
        content={
          monitoringStatus === "error" && topic.lastError
            ? `Error: ${topic.lastError}`
            : config.label
        }
      >
        <div className={`flex items-center ${config.className}`}>
          <Icon className="h-4 w-4" />
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Badge
          variant={config.badgeVariant}
          className={
            monitoringStatus === "active"
              ? "bg-green-500/90 hover:bg-green-500"
              : monitoringStatus === "paused"
                ? "bg-yellow-500/90 hover:bg-yellow-500 text-white"
                : ""
          }
        >
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      {monitoringStatus === "error" && topic.lastError && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">
          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{topic.lastError}</span>
        </div>
      )}

      {showLastChecked && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {topic.lastCheckedAt && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Checked {formatRelativeTime(new Date(topic.lastCheckedAt).toISOString())}</span>
            </div>
          )}
          {nextCheck && monitoringStatus === "active" && (
            <div className="flex items-center gap-1">
              <span>Next: {nextCheck}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
