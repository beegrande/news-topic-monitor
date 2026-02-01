import type { Topic } from "~/db/schema";
import { downloadFile } from "./export";

type MonitoringFrequency = "hourly" | "daily" | "weekly";
type NotificationFrequency = "daily" | "weekly" | "none";

/**
 * Topic configuration for export (excludes user-specific and system fields)
 */
export interface ExportTopicConfig {
  name: string;
  description: string | null;
  keywords: string;
  monitoringFrequency: MonitoringFrequency;
  includedSources: string | null;
  excludedSources: string | null;
  languages: string | null;
  notificationEnabled: boolean;
  notificationFrequency: NotificationFrequency;
  minimumRelevanceScore: number;
}

/**
 * Full export format with metadata
 */
export interface TopicExportData {
  version: string;
  exportedAt: string;
  topics: ExportTopicConfig[];
}

/**
 * Converts a topic to export format (strips user-specific fields)
 */
export function topicToExportFormat(topic: Topic): ExportTopicConfig {
  return {
    name: topic.name,
    description: topic.description,
    keywords: topic.keywords,
    monitoringFrequency: topic.monitoringFrequency as MonitoringFrequency,
    includedSources: topic.includedSources,
    excludedSources: topic.excludedSources,
    languages: topic.languages,
    notificationEnabled: topic.notificationEnabled,
    notificationFrequency: topic.notificationFrequency as NotificationFrequency,
    minimumRelevanceScore: topic.minimumRelevanceScore,
  };
}

/**
 * Creates the full export data structure
 */
export function createTopicExportData(topics: Topic[]): TopicExportData {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    topics: topics.map(topicToExportFormat),
  };
}

/**
 * Generates a filename for topic export
 */
export function generateTopicExportFilename(): string {
  const date = new Date().toISOString().split("T")[0];
  return `topic-configurations-${date}.json`;
}

/**
 * Triggers download of topic configurations
 */
export function downloadTopicExport(topics: Topic[]): void {
  const exportData = createTopicExportData(topics);
  const content = JSON.stringify(exportData, null, 2);
  const filename = generateTopicExportFilename();
  downloadFile(content, filename, "application/json");
}

/**
 * Validates imported topic data structure
 */
export function validateTopicImportData(data: unknown): {
  valid: boolean;
  error?: string;
  topics?: ExportTopicConfig[];
} {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid file format: expected JSON object" };
  }

  const obj = data as Record<string, unknown>;

  if (!obj.version || typeof obj.version !== "string") {
    return { valid: false, error: "Missing or invalid version field" };
  }

  if (!Array.isArray(obj.topics)) {
    return { valid: false, error: "Missing or invalid topics array" };
  }

  const topics: ExportTopicConfig[] = [];

  for (let i = 0; i < obj.topics.length; i++) {
    const topic = obj.topics[i] as Record<string, unknown>;

    if (!topic.name || typeof topic.name !== "string") {
      return { valid: false, error: `Topic ${i + 1}: missing or invalid name` };
    }

    if (!topic.keywords || typeof topic.keywords !== "string") {
      return { valid: false, error: `Topic ${i + 1}: missing or invalid keywords` };
    }

    // Validate and normalize monitoring frequency
    const validMonitoringFrequencies = ["hourly", "daily", "weekly"] as const;
    const monitoringFrequency: MonitoringFrequency =
      typeof topic.monitoringFrequency === "string" &&
      validMonitoringFrequencies.includes(topic.monitoringFrequency as MonitoringFrequency)
        ? (topic.monitoringFrequency as MonitoringFrequency)
        : "daily";

    // Validate and normalize notification frequency
    const validNotificationFrequencies = ["daily", "weekly", "none"] as const;
    const notificationFrequency: NotificationFrequency =
      typeof topic.notificationFrequency === "string" &&
      validNotificationFrequencies.includes(topic.notificationFrequency as NotificationFrequency)
        ? (topic.notificationFrequency as NotificationFrequency)
        : "daily";

    topics.push({
      name: topic.name,
      description: typeof topic.description === "string" ? topic.description : null,
      keywords: topic.keywords,
      monitoringFrequency,
      includedSources: typeof topic.includedSources === "string" ? topic.includedSources : null,
      excludedSources: typeof topic.excludedSources === "string" ? topic.excludedSources : null,
      languages: typeof topic.languages === "string" ? topic.languages : "en",
      notificationEnabled: typeof topic.notificationEnabled === "boolean" ? topic.notificationEnabled : true,
      notificationFrequency,
      minimumRelevanceScore: typeof topic.minimumRelevanceScore === "number" ? topic.minimumRelevanceScore : 0,
    });
  }

  return { valid: true, topics };
}

/**
 * Parses a JSON file content for topic import
 */
export function parseTopicImportFile(content: string): {
  valid: boolean;
  error?: string;
  topics?: ExportTopicConfig[];
} {
  try {
    const data = JSON.parse(content);
    return validateTopicImportData(data);
  } catch {
    return { valid: false, error: "Invalid JSON format" };
  }
}
