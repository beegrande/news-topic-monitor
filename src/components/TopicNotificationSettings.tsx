import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Slider } from "~/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { NotificationFrequency } from "~/db/schema";

interface TopicNotificationSettingsProps {
  notificationEnabled: boolean;
  notificationFrequency: NotificationFrequency;
  minimumRelevanceScore: number;
  onNotificationEnabledChange: (enabled: boolean) => void;
  onNotificationFrequencyChange: (frequency: NotificationFrequency) => void;
  onMinimumRelevanceScoreChange: (score: number) => void;
}

export function TopicNotificationSettings({
  notificationEnabled,
  notificationFrequency,
  minimumRelevanceScore,
  onNotificationEnabledChange,
  onNotificationFrequencyChange,
  onMinimumRelevanceScoreChange,
}: TopicNotificationSettingsProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      <h4 className="text-sm font-medium">Notification Settings</h4>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="notification-enabled"
          checked={notificationEnabled}
          onCheckedChange={(checked) =>
            onNotificationEnabledChange(checked === true)
          }
        />
        <Label htmlFor="notification-enabled" className="text-sm font-normal">
          Include in email digests
        </Label>
      </div>

      {notificationEnabled && (
        <>
          <div className="space-y-2">
            <Label>Notification Frequency</Label>
            <Select
              value={notificationFrequency}
              onValueChange={(value: NotificationFrequency) =>
                onNotificationFrequencyChange(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Minimum Relevance Score</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(minimumRelevanceScore * 100)}%
              </span>
            </div>
            <Slider
              value={[minimumRelevanceScore * 100]}
              onValueChange={(values) =>
                onMinimumRelevanceScoreChange(values[0] / 100)
              }
              min={0}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Only include articles with relevance above this threshold
            </p>
          </div>
        </>
      )}
    </div>
  );
}
