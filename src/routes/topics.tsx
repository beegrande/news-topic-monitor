import { createFileRoute } from "@tanstack/react-router";
import { CreateTopicDialog } from "~/components/CreateTopicDialog";
import { EditTopicDialog } from "~/components/EditTopicDialog";
import { AddToCollectionDialog } from "~/components/AddToCollectionDialog";
import { TopicTemplatesSection } from "~/components/TopicTemplatesSection";
import { ExportTopicsDialog } from "~/components/ExportTopicsDialog";
import { ImportTopicsDialog } from "~/components/ImportTopicsDialog";
import { useTopics, useDeleteTopic, useSetTopicStatus, useTopicHierarchy, useRunTopicNow } from "~/hooks/useTopics";
import type { TopicTemplate } from "~/data/topic-templates";
import type { TopicWithChildren } from "~/data-access/topics";
import {
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Tag,
  Play,
  Pause,
  Archive,
  Clock,
  BarChart3,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Layers,
  Download,
  Upload,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useState, useMemo } from "react";
import type { Topic } from "~/db/schema";

export const Route = createFileRoute("/topics")({
  component: TopicsPage,
});

type SortOption = "name" | "created" | "articles" | "status" | "hierarchy";
type FilterOption = "all" | "active" | "paused" | "archived";

function TopicsPage() {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("hierarchy");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TopicTemplate | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [createChildParentId, setCreateChildParentId] = useState<string | null>(null);
  const [createChildDialogOpen, setCreateChildDialogOpen] = useState(false);

  const handleUseTemplate = (template: TopicTemplate) => {
    setSelectedTemplate(template);
    setTemplateDialogOpen(true);
  };

  const { data: allTopics = [], isLoading, error } = useTopics(true, {
    refetchInterval: 30000, // Refresh every 30 seconds for real-time status
  });
  const { data: topicHierarchy = [] } = useTopicHierarchy();
  const deleteTopicMutation = useDeleteTopic();
  const setStatusMutation = useSetTopicStatus();
  const runTopicNowMutation = useRunTopicNow();

  const toggleExpanded = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const handleCreateChildTopic = (parentId: string) => {
    setCreateChildParentId(parentId);
    setCreateChildDialogOpen(true);
  };

  // Flatten hierarchy for display with depth info
  const flattenHierarchy = (items: TopicWithChildren[], depth = 0): Array<{ topic: TopicWithChildren; depth: number }> => {
    const result: Array<{ topic: TopicWithChildren; depth: number }> = [];
    for (const item of items) {
      result.push({ topic: item, depth });
      if (item.children && item.children.length > 0 && expandedTopics.has(item.id)) {
        result.push(...flattenHierarchy(item.children, depth + 1));
      }
    }
    return result;
  };

  // Filter and sort topics
  const topics = useMemo(() => {
    // If using hierarchy view and no search/filter, use hierarchical display
    if (sortBy === "hierarchy" && !searchQuery.trim() && filterBy === "all") {
      return flattenHierarchy(topicHierarchy);
    }

    let filtered = allTopics;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (topic) =>
          topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.keywords.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy !== "all") {
      filtered = filtered.filter((topic) => topic.status === filterBy);
    }

    // Apply sorting
    filtered = filtered.slice().sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "articles":
          return (b.articleCount || 0) - (a.articleCount || 0);
        case "status":
          return a.status.localeCompare(b.status);
        case "hierarchy":
          // Fall back to created date when not showing full hierarchy
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    // Convert to flat format with depth 0
    return filtered.map(topic => ({ topic: { ...topic, children: [] } as TopicWithChildren, depth: 0 }));
  }, [allTopics, topicHierarchy, searchQuery, sortBy, filterBy, expandedTopics]);

  const handleDeleteTopic = () => {
    if (selectedTopic) {
      deleteTopicMutation.mutate(selectedTopic.id, {
        onSuccess: () => {
          setSelectedTopic(null);
          setDeleteDialogOpen(false);
        },
      });
    }
  };

  const handleStatusChange = (
    topic: Topic,
    status: "active" | "paused" | "archived"
  ) => {
    setStatusMutation.mutate({ id: topic.id, status });
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500">
            Active
          </Badge>
        );
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "hourly":
        return "Every hour";
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      default:
        return frequency;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">News Topics</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage topics you want to monitor for news
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ImportTopicsDialog
              trigger={
                <Button variant="outline" size="icon" title="Import topics">
                  <Upload className="w-4 h-4" />
                </Button>
              }
            />
            <ExportTopicsDialog
              trigger={
                <Button variant="outline" size="icon" title="Export topics">
                  <Download className="w-4 h-4" />
                </Button>
              }
            />
            <CreateTopicDialog
              trigger={
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Topic
                </Button>
              }
            />
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-destructive">
              Error loading topics: {(error as Error).message}
            </p>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search topics by name, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    {filterBy === "all" ? "All Status" : filterBy}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilterBy("all")}>
                    {filterBy === "all" && "✓ "} All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy("active")}>
                    {filterBy === "active" && "✓ "} Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy("paused")}>
                    {filterBy === "paused" && "✓ "} Paused
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy("archived")}>
                    {filterBy === "archived" && "✓ "} Archived
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("hierarchy")}>
                    {sortBy === "hierarchy" && "✓ "} Hierarchy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("created")}>
                    {sortBy === "created" && "✓ "} Date Created
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    {sortBy === "name" && "✓ "} Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("articles")}>
                    {sortBy === "articles" && "✓ "} Article Count
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("status")}>
                    {sortBy === "status" && "✓ "} Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Topics List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-muted rounded mb-3 w-3/4"></div>
                <div className="h-4 bg-muted rounded mb-2 w-full"></div>
                <div className="h-4 bg-muted rounded mb-4 w-2/3"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map(({ topic, depth }) => {
              const hasChildren = topic.children && topic.children.length > 0;
              const isExpanded = expandedTopics.has(topic.id);

              return (
                <div
                  key={topic.id}
                  className="group bg-card border rounded-lg p-6 hover:border-primary/50 transition-all"
                  style={{ marginLeft: `${depth * 1.5}rem` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Expand/collapse button for parent topics */}
                      {hasChildren ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-10 h-10 p-0"
                          onClick={() => toggleExpanded(topic.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-primary" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-primary" />
                          )}
                        </Button>
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
                          {depth > 0 ? (
                            <Layers className="w-5 h-5 text-primary" />
                          ) : (
                            <Newspaper className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{topic.name}</h3>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(topic.status)}
                          {hasChildren && (
                            <Badge variant="outline" className="text-xs">
                              {topic.children!.length} subtopic{topic.children!.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <EditTopicDialog
                          topic={topic}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Topic
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuItem
                          onClick={() => handleCreateChildTopic(topic.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Subtopic
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/topic/$id/analytics" params={{ id: topic.id }}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => runTopicNowMutation.mutate(topic.id)}
                          disabled={runTopicNowMutation.isPending}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          {runTopicNowMutation.isPending ? "Running..." : "Run Now"}
                        </DropdownMenuItem>
                        <AddToCollectionDialog
                          topicId={topic.id}
                          topicName={topic.name}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <FolderPlus className="w-4 h-4 mr-2" />
                              Add to Collection
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuSeparator />
                        {topic.status !== "active" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(topic, "active")}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        {topic.status !== "paused" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(topic, "paused")}
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {topic.status !== "archived" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(topic, "archived")}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTopic(topic);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {topic.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {topic.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-4">
                    {topic.keywords.split(",").slice(0, 3).map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {keyword.trim()}
                      </Badge>
                    ))}
                    {topic.keywords.split(",").length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{topic.keywords.split(",").length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{getFrequencyLabel(topic.monitoringFrequency)}</span>
                    </div>
                    <Link
                      to="/topic/$id/analytics"
                      params={{ id: topic.id }}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>{(topic as any).articleCount || 0} articles</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center mx-auto mb-8">
              <Newspaper className="w-16 h-16 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Create Your First Topic</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
              Start monitoring news by creating topics with keywords you want to
              track.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-2xl mx-auto text-left">
              <div className="p-4 bg-muted/50 rounded-lg">
                <Tag className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-2">Define Keywords</h4>
                <p className="text-sm text-muted-foreground">
                  Add keywords to track specific topics in the news.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <Clock className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-2">Set Frequency</h4>
                <p className="text-sm text-muted-foreground">
                  Choose how often to check for new articles.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <Newspaper className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-2">Get Updates</h4>
                <p className="text-sm text-muted-foreground">
                  Receive relevant news articles automatically.
                </p>
              </div>
            </div>

            <CreateTopicDialog
              trigger={
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create Your First Topic
                </Button>
              }
            />

            <TopicTemplatesSection onUseTemplate={handleUseTemplate} />

            {/* Template Dialog */}
            <CreateTopicDialog
              open={templateDialogOpen}
              onOpenChange={setTemplateDialogOpen}
              initialValues={
                selectedTemplate
                  ? {
                      name: selectedTemplate.name,
                      description: selectedTemplate.description,
                      keywords: selectedTemplate.keywords,
                    }
                  : undefined
              }
            />
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Topic</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedTopic?.name}"? This
                action cannot be undone and will permanently remove the topic
                and all its associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteTopicMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteTopic}
                disabled={deleteTopicMutation.isPending}
              >
                {deleteTopicMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Child Topic Dialog */}
        <CreateTopicDialog
          open={createChildDialogOpen}
          onOpenChange={setCreateChildDialogOpen}
          defaultParentId={createChildParentId || undefined}
          onTopicCreated={() => {
            setCreateChildDialogOpen(false);
            setCreateChildParentId(null);
            // Expand the parent topic to show the new child
            if (createChildParentId) {
              setExpandedTopics(prev => new Set([...prev, createChildParentId]));
            }
          }}
        />
      </div>
    </div>
  );
}
