import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getExportPreviewFn, exportArticlesFn } from "~/fn/export";
import { downloadFile } from "~/utils/export";
import { getErrorMessage } from "~/utils/error";
import type { ArticleSentiment } from "~/db/schema";

export interface ExportParams {
  topicId: string;
  source?: string;
  sentiment?: ArticleSentiment;
  dateFrom?: string;
  dateTo?: string;
}

export function useExportPreview(params: ExportParams, enabled = true) {
  return useQuery({
    queryKey: [
      "export-preview",
      params.topicId,
      params.source,
      params.sentiment,
      params.dateFrom,
      params.dateTo,
    ],
    queryFn: () => getExportPreviewFn({ data: params }),
    enabled,
    staleTime: 30000, // 30 seconds
  });
}

export function useExportArticles() {
  return useMutation({
    mutationFn: async (
      data: ExportParams & { format: "csv" | "json" }
    ) => {
      const result = await exportArticlesFn({ data });
      return result;
    },
    onSuccess: (result) => {
      downloadFile(result.content, result.filename, result.mimeType);
      toast.success("Export complete", {
        description: `Downloaded ${result.filename}`,
      });
    },
    onError: (error) => {
      toast.error("Export failed", {
        description: getErrorMessage(error),
      });
    },
  });
}
