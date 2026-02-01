import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, BarChart3, ChevronLeft } from "lucide-react";
import {
  TopicAnalytics,
  TopicAnalyticsSkeleton,
} from "~/components/TopicAnalytics";
import { EmptyState } from "~/components/EmptyState";
import { Page } from "~/components/Page";
import { PageTitle } from "~/components/PageTitle";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { Button } from "~/components/ui/button";
import { getTopicAnalyticsQuery } from "~/queries/articles";
import { getTopicByIdFn } from "~/fn/topics";

export const Route = createFileRoute("/topic/$id/analytics")({
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const topicId = params.id;

    // Load topic data
    const topic = await getTopicByIdFn({ data: { id: topicId } });

    // Preload analytics data
    queryClient.ensureQueryData(getTopicAnalyticsQuery({ topicId }));

    return { topic };
  },
  component: TopicAnalyticsPage,
});

function TopicAnalyticsPage() {
  const { id: topicId } = Route.useParams();
  const { topic } = Route.useLoaderData();

  const { data, isLoading, error } = useQuery(
    getTopicAnalyticsQuery({ topicId })
  );

  return (
    <Page>
      <div className="space-y-6">
        <AppBreadcrumb
          items={[
            { label: "Home", href: "/", icon: Home },
            { label: topic.name },
            { label: "Analytics", icon: BarChart3 },
          ]}
        />

        <div className="flex items-center gap-4">
          <a href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          </a>
        </div>

        <PageTitle
          title={`Analytics for "${topic.name}"`}
          description="Article volume, sentiment trends, source distribution, and trending keywords"
        />

        {isLoading ? (
          <TopicAnalyticsSkeleton />
        ) : error ? (
          <EmptyState
            icon={<BarChart3 className="h-10 w-10 text-primary/60" />}
            title="Error loading analytics"
            description="There was a problem loading the analytics data. Please try again."
          />
        ) : data ? (
          <TopicAnalytics data={data} />
        ) : (
          <EmptyState
            icon={<BarChart3 className="h-10 w-10 text-primary/60" />}
            title="No analytics data"
            description="Analytics will appear once articles have been collected for this topic."
          />
        )}
      </div>
    </Page>
  );
}
