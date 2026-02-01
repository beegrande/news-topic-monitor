import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users,
  Plus,
  MoreVertical,
  Settings,
  Trash2,
  UserPlus,
  Newspaper,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { Page } from "~/components/Page";
import { PageTitle } from "~/components/PageTitle";
import { EmptyState } from "~/components/EmptyState";
import { CreateTeamDialog } from "~/components/CreateTeamDialog";
import { useTeams, useDeleteTeam } from "~/hooks/useTeams";
import { authClient } from "~/lib/auth-client";
import type { TeamWithMemberCount } from "~/data-access/teams";

export const Route = createFileRoute("/teams")({
  component: TeamsPage,
});

function TeamCard({ team, onDelete }: { team: TeamWithMemberCount; onDelete: (id: string) => void }) {
  return (
    <Card className="group hover:shadow-lg hover:border-border/60 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                  {team.name}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/teams/$id" params={{ id: team.id }} search={{}}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Team
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/teams/$id" params={{ id: team.id }} search={{ tab: "invite" }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Members
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(team.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {team.description && (
          <CardDescription className="line-clamp-2 mt-2">
            {team.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Link
          to="/teams/$id"
          params={{ id: team.id }}
          search={{}}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Newspaper className="h-4 w-4" />
          View shared topics
        </Link>
      </CardContent>
    </Card>
  );
}

function TeamsPage() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const { data: teams, isLoading } = useTeams();
  const deleteTeamMutation = useDeleteTeam();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleDeleteClick = (id: string) => {
    setTeamToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (teamToDelete) {
      deleteTeamMutation.mutate(teamToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setTeamToDelete(null);
        },
      });
    }
  };

  if (isSessionPending) {
    return (
      <Page>
        <div className="space-y-8">
          <PageTitle
            title="Teams"
            description="Collaborate with others on monitoring topics"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="h-5 bg-muted rounded w-3/4 mt-2" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </Page>
    );
  }

  if (!session?.user) {
    return (
      <Page>
        <div className="space-y-8">
          <PageTitle
            title="Teams"
            description="Collaborate with others on monitoring topics"
          />
          <EmptyState
            icon={<Users className="h-10 w-10 text-primary/60" />}
            title="Sign in required"
            description="Please sign in to view and manage your teams."
            actionLabel="Sign In"
            onAction={() => window.location.href = "/sign-in"}
          />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageTitle
            title="Teams"
            description="Collaborate with others on monitoring topics"
          />
          <CreateTeamDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Team
              </Button>
            }
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="h-5 bg-muted rounded w-3/4 mt-2" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : teams && teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-10 w-10 text-primary/60" />}
            title="No teams yet"
            description="Create a team to collaborate with others on monitoring news topics and sharing insights."
            actionLabel="Create Your First Team"
            onAction={() => setCreateDialogOpen(true)}
          />
        )}

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Team</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this team? This action cannot be
                undone and will remove all team members and shared topics.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteTeamMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteTeamMutation.isPending}
              >
                {deleteTeamMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Page>
  );
}
