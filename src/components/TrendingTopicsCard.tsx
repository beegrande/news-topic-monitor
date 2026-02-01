import { TrendingUp, Newspaper, Users, Plus, Hash } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CreateTopicDialog } from "~/components/CreateTopicDialog";
import { useTrendingTopics } from "~/hooks/useTopics";
import type { TrendingTopic } from "~/data-access/topics";

interface TrendingTopicsCardProps {
  limit?: number;
}

function TrendingTopicItem({
  topic,
  rank,
  onCreateTopic,
}: {
  topic: TrendingTopic;
  rank: number;
  onCreateTopic: (keywords: string, name: string) => void;
}) {
  const keywords = topic.keywords.split(",").map((k) => k.trim()).slice(0, 3);

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b last:border-b-0">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="text-lg font-semibold text-muted-foreground w-6">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{topic.sampleTopicName}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {keywords.map((keyword, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-xs font-normal"
              >
                <Hash className="w-3 h-3 mr-0.5" />
                {keyword}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Newspaper className="w-3 h-3" />
              {topic.articleCount} articles
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {topic.topicCount} {topic.topicCount === 1 ? "monitor" : "monitors"}
            </span>
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="shrink-0"
        onClick={() => onCreateTopic(topic.keywords, topic.sampleTopicName)}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}

function TrendingTopicsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3 border-b last:border-b-0">
          <div className="w-6 h-6 bg-muted rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="flex gap-1">
              <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendingTopicsCard({ limit = 5 }: TrendingTopicsCardProps) {
  const { data: trendingTopics, isLoading } = useTrendingTopics(limit);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<{
    keywords: string;
    name: string;
  } | null>(null);

  const handleCreateTopic = (keywords: string, name: string) => {
    setPrefillData({ keywords, name });
    setCreateDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setPrefillData(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Trending Topics
          </CardTitle>
          <CardDescription>
            Popular topics being monitored across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TrendingTopicsSkeleton count={limit} />
          ) : !trendingTopics || trendingTopics.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No trending topics yet</p>
              <p className="text-xs">Be the first to create a topic!</p>
            </div>
          ) : (
            <div>
              {trendingTopics.map((topic, index) => (
                <TrendingTopicItem
                  key={topic.keywords}
                  topic={topic}
                  rank={index + 1}
                  onCreateTopic={handleCreateTopic}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTopicDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        initialValues={
          prefillData
            ? {
                name: `${prefillData.name} Monitor`,
                keywords: prefillData.keywords,
              }
            : undefined
        }
      />
    </>
  );
}
