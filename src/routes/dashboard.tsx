import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Newspaper, Home, LayoutDashboard, Plus, FileText, TrendingUp, Bell } from "lucide-react";
import { TopicCard } from "~/components/TopicCard";
import { EmptyState } from "~/components/EmptyState";
import { Page } from "~/components/Page";
import { PageTitle } from "~/components/PageTitle";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { CreateTopicDialog } from "~/components/CreateTopicDialog";
import { ShareTopicDialog } from "~/components/ShareTopicDialog";
import { RecommendedArticles } from "~/components/RecommendedArticles";
import { TrendingTopicsCard } from "~/components/TrendingTopicsCard";
import { StatCard, StatCardSkeleton } from "~/components/StatCard";
import type { TopicWithArticleCount } from "~/data-access/topics";
import { Button } from "~/components/ui/button";
import { useTopics, useDeleteTopic, useSetTopicStatus } from "~/hooks/useTopics";
import { useState, useMemo } from "react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function TopicGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-lg border border-border overflow-hidden shadow-sm p-6"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-full animate-pulse" />
            <div className="flex flex-wrap gap-1.5 pt-2">
              <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
              <div className="h-5 w-14 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="flex justify-between pt-4 border-t">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const { data: topics, isLoading } = useTopics();
  const deleteTopicMutation = useDeleteTopic();
  const setStatusMutation = useSetTopicStatus();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shareDialogTopic, setShareDialogTopic] = useState<TopicWithArticleCount | null>(null);

  const handleStatusChange = (
    id: string,
    status: "active" | "paused" | "archived"
  ) => {
    setStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this topic?")) {
      deleteTopicMutation.mutate(id);
    }
  };

  const handleEdit = (topic: { id: string }) => {
    // For now, we'll just log - edit functionality can be added later
    console.log("Edit topic:", topic.id);
  };

  // Show loading while checking session
  if (isSessionPending) {
    return (
      <Page>
        <div className="space-y-8">
          <AppBreadcrumb
            items={[
              { label: "Home", href: "/", icon: Home },
              { label: "Dashboard", icon: LayoutDashboard },
            ]}
          />
          <PageTitle
            title="Topic Dashboard"
            description="Monitor and manage your news topics"
          />
          <TopicGridSkeleton count={6} />
        </div>
      </Page>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    return (
      <Page>
        <div className="space-y-8">
          <AppBreadcrumb
            items={[
              { label: "Home", href: "/", icon: Home },
              { label: "Dashboard", icon: LayoutDashboard },
            ]}
          />
          <PageTitle
            title="Topic Dashboard"
            description="Monitor and manage your news topics"
          />
          <EmptyState
            icon={<Newspaper className="h-10 w-10 text-primary/60" />}
            title="Sign in required"
            description="Please sign in to view and manage your monitored topics."
            actionLabel="Sign In"
            onAction={() => navigate({ to: "/sign-in", search: {} })}
          />
        </div>
      </Page>
    );
  }

  // Calculate stats from topics data
  const stats = useMemo(() => {
    if (!topics) return null;

    const totalTopics = topics.length;
    const activeTopics = topics.filter((t) => t.status === "active").length;
    const totalArticles = topics.reduce((sum, t) => sum + (t.articleCount || 0), 0);
    const topicsWithAlerts = topics.filter((t) => t.notificationEnabled).length;

    return { totalTopics, activeTopics, totalArticles, topicsWithAlerts };
  }, [topics]);

  return (
    <Page>
      <div className="space-y-8">
        <AppBreadcrumb
          items={[
            { label: "Home", href: "/", icon: Home },
            { label: "Dashboard", icon: LayoutDashboard },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageTitle
            title="Topic Dashboard"
            description="Monitor and manage your news topics"
          />
          <CreateTopicDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Topic
              </Button>
            }
          />
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Topics"
              value={stats.totalTopics}
              description="Topics you're monitoring"
              icon={Newspaper}
            />
            <StatCard
              label="Active Topics"
              value={stats.activeTopics}
              description="Currently monitoring"
              icon={TrendingUp}
              variant={stats.activeTopics > 0 ? "success" : "default"}
            />
            <StatCard
              label="Total Articles"
              value={stats.totalArticles}
              description="Articles collected"
              icon={FileText}
            />
            <StatCard
              label="Alert Topics"
              value={stats.topicsWithAlerts}
              description="Topics with notifications"
              icon={Bell}
              variant={stats.topicsWithAlerts > 0 ? "success" : "default"}
            />
          </div>
        ) : null}

        {/* Recommendations Section */}
        {topics && topics.length > 0 && (
          <RecommendedArticles limit={6} showHeader showStats />
        )}

        {/* Trending Topics Discovery Section */}
        <section className="space-y-6" aria-labelledby="trending-heading">
          <TrendingTopicsCard limit={5} />
        </section>

        <section className="space-y-6" aria-labelledby="topics-heading">
          <h2 id="topics-heading" className="text-xl font-semibold">
            Your Topics
          </h2>

          {isLoading ? (
            <TopicGridSkeleton count={6} />
          ) : topics && topics.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onShare={(t) => setShareDialogTopic(t)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Newspaper className="h-10 w-10 text-primary/60" />}
              title="No topics yet"
              description="Start monitoring news by creating your first topic. You'll receive updates when new articles match your keywords."
              actionLabel="Create Your First Topic"
              onAction={() => setCreateDialogOpen(true)}
            />
          )}
        </section>

        {shareDialogTopic && (
          <ShareTopicDialog
            topic={shareDialogTopic}
            onOpenChange={(open) => !open && setShareDialogTopic(null)}
          />
        )}
      </div>
    </Page>
  );
}
