import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// Common timezones for scheduling
const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Copenhagen", label: "Copenhagen" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Australia/Sydney", label: "Sydney" },
];

const DAYS_OF_WEEK = [
  { value: "0", label: "Sun" },
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
];

// Generate hours for dropdown (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: i.toString().padStart(2, "0") + ":00",
}));

interface TopicScheduleSettingsProps {
  scheduleEnabled: boolean;
  scheduleDays: string | null;
  scheduleStartHour: number | null;
  scheduleEndHour: number | null;
  scheduleTimezone: string | null;
  onScheduleEnabledChange: (enabled: boolean) => void;
  onScheduleDaysChange: (days: string | null) => void;
  onScheduleStartHourChange: (hour: number | null) => void;
  onScheduleEndHourChange: (hour: number | null) => void;
  onScheduleTimezoneChange: (timezone: string | null) => void;
}

export function TopicScheduleSettings({
  scheduleEnabled,
  scheduleDays,
  scheduleStartHour,
  scheduleEndHour,
  scheduleTimezone,
  onScheduleEnabledChange,
  onScheduleDaysChange,
  onScheduleStartHourChange,
  onScheduleEndHourChange,
  onScheduleTimezoneChange,
}: TopicScheduleSettingsProps) {
  // Parse selected days from comma-separated string
  const selectedDays = scheduleDays
    ? scheduleDays.split(",").map((d) => d.trim())
    : [];

  // Toggle a day in the selection
  const toggleDay = (dayValue: string) => {
    const newDays = selectedDays.includes(dayValue)
      ? selectedDays.filter((d) => d !== dayValue)
      : [...selectedDays, dayValue].sort((a, b) => parseInt(a) - parseInt(b));

    onScheduleDaysChange(newDays.length > 0 ? newDays.join(",") : null);
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h4 className="text-sm font-medium">Monitoring Schedule</h4>
      <p className="text-xs text-muted-foreground">
        Limit when this topic is checked for updates to optimize API usage.
      </p>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="schedule-enabled"
          checked={scheduleEnabled}
          onCheckedChange={(checked) =>
            onScheduleEnabledChange(checked === true)
          }
        />
        <Label htmlFor="schedule-enabled" className="text-sm font-normal">
          Enable custom schedule
        </Label>
      </div>

      {scheduleEnabled && (
        <>
          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    selectedDays.includes(day.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-input hover:bg-accent"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select days when monitoring should run. Leave empty for all days.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select
                value={scheduleStartHour?.toString() ?? "0"}
                onValueChange={(value) =>
                  onScheduleStartHourChange(parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Start hour" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>End Time</Label>
              <Select
                value={scheduleEndHour?.toString() ?? "23"}
                onValueChange={(value) =>
                  onScheduleEndHourChange(parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="End hour" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Monitoring will only run between these hours.
          </p>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={scheduleTimezone || "UTC"}
              onValueChange={(value) => onScheduleTimezoneChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
