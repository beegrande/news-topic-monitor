import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Star } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Tooltip } from "~/components/ui/tooltip";
import { useSourceCredibility } from "~/hooks/useSourceCredibility";

interface SourceCredibilityBadgeProps {
  sourceName: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

/**
 * Get the credibility label based on score.
 */
export function getSourceCredibilityLabel(score: number): string {
  if (score >= 80) return "Highly Reliable";
  if (score >= 60) return "Reliable";
  if (score >= 40) return "Mixed";
  if (score >= 20) return "Questionable";
  return "Unreliable";
}

/**
 * Get the color class based on credibility score.
 */
export function getSourceCredibilityColor(score: number): string {
  if (score >= 80) return "green";
  if (score >= 60) return "blue";
  if (score >= 40) return "yellow";
  if (score >= 20) return "orange";
  return "red";
}

/**
 * Get the color classes for the badge.
 */
function getColorClasses(color: string): string {
  const colorClasses: Record<string, string> = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  };
  return colorClasses[color] || colorClasses.blue;
}

/**
 * Get the icon component based on score.
 */
function getCredibilityIcon(score: number | null) {
  if (score === null) return ShieldQuestion;
  if (score >= 60) return ShieldCheck;
  if (score >= 40) return Shield;
  return ShieldAlert;
}

/**
 * Build the tooltip content.
 */
function buildTooltipContent(
  sourceName: string,
  score: number | null,
  feedbackCount: number,
  feedbackScore: number | null
): string {
  const parts: string[] = [`Source: ${sourceName}`];

  if (score !== null) {
    const label = getSourceCredibilityLabel(score);
    parts.push(`Credibility: ${score}% (${label})`);
  } else {
    parts.push("Credibility: Not yet rated");
  }

  if (feedbackCount > 0 && feedbackScore !== null) {
    parts.push(`User Rating: ${feedbackScore.toFixed(1)}/5 (${feedbackCount} reviews)`);
  }

  return parts.join(" | ");
}

export function SourceCredibilityBadge({
  sourceName,
  size = "sm",
  showLabel = false,
}: SourceCredibilityBadgeProps) {
  const { data, isLoading } = useSourceCredibility(sourceName);

  // Show nothing while loading or if no source name
  if (isLoading || !sourceName) {
    return null;
  }

  const credibility = data?.credibility;
  const score = credibility?.credibilityScore ?? null;
  const feedbackCount = credibility?.userFeedbackCount ?? 0;
  const feedbackScore = credibility?.userFeedbackScore ?? null;

  const IconComponent = getCredibilityIcon(score);
  const color = score !== null ? getSourceCredibilityColor(score) : "blue";
  const colorClasses = getColorClasses(color);
  const label = score !== null ? getSourceCredibilityLabel(score) : "Unrated";

  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const badgeSize = size === "sm" ? "text-xs" : "text-sm";

  const tooltipContent = buildTooltipContent(
    sourceName,
    score,
    feedbackCount,
    feedbackScore
  );

  // Show user rating stars if available
  const showStars = feedbackCount > 0 && feedbackScore !== null;

  return (
    <Tooltip content={tooltipContent}>
      <Badge variant="outline" className={`${badgeSize} ${colorClasses} cursor-default`}>
        <IconComponent className={`${iconSize} mr-1`} />
        {showLabel && <span className="mr-1">{label}</span>}
        {score !== null && <span>{score}%</span>}
        {score === null && <span>?</span>}
        {showStars && (
          <span className="ml-1 flex items-center">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span className="ml-0.5">{feedbackScore.toFixed(1)}</span>
          </span>
        )}
      </Badge>
    </Tooltip>
  );
}

/**
 * Simpler inline version for use in lists where we don't want to fetch data per-item.
 * Takes pre-loaded credibility score directly.
 */
interface InlineSourceCredibilityBadgeProps {
  score: number | null;
  size?: "sm" | "md";
}

export function InlineSourceCredibilityBadge({
  score,
  size = "sm",
}: InlineSourceCredibilityBadgeProps) {
  if (score === null) {
    return null;
  }

  const IconComponent = getCredibilityIcon(score);
  const color = getSourceCredibilityColor(score);
  const colorClasses = getColorClasses(color);
  const label = getSourceCredibilityLabel(score);

  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const badgeSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <Tooltip content={`Source Credibility: ${score}% - ${label}`}>
      <Badge variant="outline" className={`${badgeSize} ${colorClasses} cursor-default`}>
        <IconComponent className={`${iconSize} mr-1`} />
        {score}%
      </Badge>
    </Tooltip>
  );
}
