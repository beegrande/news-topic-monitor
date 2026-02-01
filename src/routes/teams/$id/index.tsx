import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Users,
  Newspaper,
  Settings,
  UserPlus,
  Trash2,
  MoreVertical,
  Crown,
  Shield,
  User,
  Mail,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Page } from "~/components/Page";
import { EmptyState } from "~/components/EmptyState";
import {
  useTeamById,
  useTeamMembers,
  useTeamInvitations,
  useTeamTopics,
  useUpdateTeam,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
  useCancelInvitation,
} from "~/hooks/useTeams";
import { authClient } from "~/lib/auth-client";
import type { TeamMemberWithUser } from "~/data-access/teams";
import type { TeamInvitation, Topic } from "~/db/schema";

export const Route = createFileRoute("/teams/$id/")({
  component: TeamDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || undefined,
  }),
});

type TabType = "overview" | "members" | "topics" | "invite" | "settings";

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const roleLabels = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function MemberCard({
  member,
  currentUserId,
  currentUserRole,
  onRemove,
  onUpdateRole,
}: {
  member: TeamMemberWithUser;
  currentUserId: string;
  currentUserRole: string | null;
  onRemove: (userId: string) => void;
  onUpdateRole: (userId: string, role: "owner" | "admin" | "member") => void;
}) {
  const RoleIcon = roleIcons[member.role as keyof typeof roleIcons] || User;
  const canManage = currentUserRole === "owner" || (currentUserRole === "admin" && member.role === "member");
  const canChangeRole = currentUserRole === "owner";
  const isSelf = member.userId === currentUserId;

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            {member.user.image ? (
              <img
                src={member.user.image}
                alt={member.user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{member.user.name}</span>
              {isSelf && (
                <Badge variant="outline" className="text-xs">
                  You
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-3 h-3" />
              {member.user.email}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <RoleIcon className="w-3 h-3" />
            {roleLabels[member.role as keyof typeof roleLabels] || member.role}
          </Badge>
          {(canManage || isSelf) && member.role !== "owner" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canChangeRole && !isSelf && (
                  <>
                    {member.role !== "admin" && (
                      <DropdownMenuItem onClick={() => onUpdateRole(member.userId, "admin")}>
                        <Shield className="h-4 w-4 mr-2" />
                        Make Admin
                      </DropdownMenuItem>
                    )}
                    {member.role !== "member" && (
                      <DropdownMenuItem onClick={() => onUpdateRole(member.userId, "member")}>
                        <User className="h-4 w-4 mr-2" />
                        Make Member
                      </DropdownMenuItem>
                    )}
                    {member.role !== "owner" && (
                      <DropdownMenuItem onClick={() => onUpdateRole(member.userId, "owner")}>
                        <Crown className="h-4 w-4 mr-2" />
                        Transfer Ownership
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRemove(member.userId)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isSelf ? "Leave Team" : "Remove"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InvitationCard({
  invitation,
  onCancel,
}: {
  invitation: TeamInvitation;
  onCancel: (id: string) => void;
}) {
  const isExpired = new Date() > new Date(invitation.expiresAt);

  return (
    <Card className={isExpired ? "opacity-60" : ""}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Mail className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <span className="font-medium">{invitation.email}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {invitation.role}
              </Badge>
              {isExpired ? (
                <span className="text-destructive">Expired</span>
              ) : (
                <span>Pending</span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCancel(invitation.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function TeamTopicCard({ topic }: { topic: Topic }) {
  const keywords = topic.keywords.split(",").map((k) => k.trim()).filter(Boolean);

  return (
    <Card className="hover:shadow-lg hover:border-border/60 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant={topic.status === "active" ? "default" : "secondary"}
            className={topic.status === "active" ? "bg-green-500/90" : ""}
          >
            {topic.status}
          </Badge>
        </div>
        <CardTitle className="text-lg line-clamp-1">{topic.name}</CardTitle>
        {topic.description && (
          <CardDescription className="line-clamp-2">
            {topic.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {keywords.slice(0, 3).map((keyword, index) => (
            <Badge key={index} variant="secondary" className="text-xs font-normal">
              {keyword}
            </Badge>
          ))}
          {keywords.length > 3 && (
            <Badge variant="secondary" className="text-xs font-normal">
              +{keywords.length - 3} more
            </Badge>
          )}
        </div>
        <div className="mt-3 pt-3 border-t">
          <Link
            to="/topic/$id/articles"
            params={{ id: topic.id }}
            className="text-sm text-primary hover:underline"
          >
            View articles
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamDetailPage() {
  const { id } = Route.useParams();
  const search = useSearch({ from: "/teams/$id/" });
  const { data: session } = authClient.useSession();
  const { data: team, isLoading: teamLoading, error: teamError } = useTeamById(id);
  const { data: members, isLoading: membersLoading } = useTeamMembers(id);
  const { data: invitations } = useTeamInvitations(id);
  const { data: topics, isLoading: topicsLoading } = useTeamTopics(id);

  const updateTeamMutation = useUpdateTeam();
  const inviteMemberMutation = useInviteMember();
  const removeMemberMutation = useRemoveMember();
  const updateMemberRoleMutation = useUpdateMemberRole();
  const cancelInvitationMutation = useCancelInvitation();

  const [activeTab, setActiveTab] = useState<TabType>(
    (search.tab as TabType) || "overview"
  );
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const currentUserId = session?.user?.id;
  const currentUserRole = members?.find((m) => m.userId === currentUserId)?.role || null;
  const isOwnerOrAdmin = currentUserRole === "owner" || currentUserRole === "admin";

  const handleRemoveMember = (userId: string) => {
    setMemberToRemove(userId);
    setRemoveDialogOpen(true);
  };

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(
        { teamId: id, userId: memberToRemove },
        {
          onSuccess: () => {
            setRemoveDialogOpen(false);
            setMemberToRemove(null);
          },
        }
      );
    }
  };

  const handleUpdateRole = (userId: string, role: "owner" | "admin" | "member") => {
    updateMemberRoleMutation.mutate({ teamId: id, userId, role });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    inviteMemberMutation.mutate(
      { teamId: id, email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail("");
          setInviteRole("member");
        },
      }
    );
  };

  const handleUpdateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    updateTeamMutation.mutate({
      id,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
  };

  // Initialize edit fields when team loads
  if (team && !editName) {
    setEditName(team.name);
    setEditDescription(team.description || "");
  }

  if (teamLoading) {
    return (
      <Page>
        <div className="space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </Page>
    );
  }

  if (teamError || !team) {
    return (
      <Page>
        <div className="space-y-8">
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold mb-3">Team not found</h3>
            <p className="text-muted-foreground mb-8">
              The team you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button asChild>
              <Link to="/teams">Back to Teams</Link>
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Users },
    { id: "members" as const, label: "Members", icon: Users, count: team.memberCount },
    { id: "topics" as const, label: "Topics", icon: Newspaper, count: team.topicCount },
    ...(isOwnerOrAdmin
      ? [
          { id: "invite" as const, label: "Invite", icon: UserPlus },
          { id: "settings" as const, label: "Settings", icon: Settings },
        ]
      : []),
  ];

  return (
    <Page>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/teams">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Teams
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{team.name}</h1>
              {team.description && (
                <p className="text-muted-foreground">{team.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {"count" in tab && tab.count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{team.memberCount}</div>
                <p className="text-sm text-muted-foreground">
                  Team member{team.memberCount !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Newspaper className="w-5 h-5" />
                  Shared Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{team.topicCount}</div>
                <p className="text-sm text-muted-foreground">
                  Topic{team.topicCount !== 1 ? "s" : ""} shared with team
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Your Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {currentUserRole && (
                    <>
                      {(() => {
                        const RoleIcon = roleIcons[currentUserRole as keyof typeof roleIcons] || User;
                        return <RoleIcon className="w-5 h-5" />;
                      })()}
                      <span className="text-xl font-bold capitalize">
                        {roleLabels[currentUserRole as keyof typeof roleLabels] || currentUserRole}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-4">
            {membersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-10 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    currentUserId={currentUserId || ""}
                    currentUserRole={currentUserRole}
                    onRemove={handleRemoveMember}
                    onUpdateRole={handleUpdateRole}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Users className="h-10 w-10 text-primary/60" />}
                title="No members"
                description="This team has no members yet."
              />
            )}

            {invitations && invitations.filter((i) => i.status === "pending").length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Pending Invitations</h3>
                <div className="space-y-3">
                  {invitations
                    .filter((i) => i.status === "pending")
                    .map((invitation) => (
                      <InvitationCard
                        key={invitation.id}
                        invitation={invitation}
                        onCancel={(id) => cancelInvitationMutation.mutate(id)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "topics" && (
          <div>
            {topicsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-5 bg-muted rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : topics && topics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic) => (
                  <TeamTopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Newspaper className="h-10 w-10 text-primary/60" />}
                title="No shared topics"
                description="No topics have been shared with this team yet. Team members can share their topics from the Topics page."
                actionLabel="Go to Topics"
                onAction={() => (window.location.href = "/topics")}
              />
            )}
          </div>
        )}

        {activeTab === "invite" && isOwnerOrAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Invite a Member</CardTitle>
              <CardDescription>
                Send an invitation to someone's email address to join this team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member - Can view shared topics</SelectItem>
                      <SelectItem value="admin">Admin - Can manage members and invitations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={inviteMemberMutation.isPending || !inviteEmail.trim()}
                >
                  {inviteMemberMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "settings" && isOwnerOrAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Team Settings</CardTitle>
              <CardDescription>Update your team's information.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="teamDescription">Description</Label>
                  <Textarea
                    id="teamDescription"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={500}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updateTeamMutation.isPending || !editName.trim()}
                >
                  {updateTeamMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Remove Member Dialog */}
        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {memberToRemove === currentUserId ? "Leave Team" : "Remove Member"}
              </DialogTitle>
              <DialogDescription>
                {memberToRemove === currentUserId
                  ? "Are you sure you want to leave this team? You will lose access to all shared topics."
                  : "Are you sure you want to remove this member from the team?"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRemoveDialogOpen(false)}
                disabled={removeMemberMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmRemoveMember}
                disabled={removeMemberMutation.isPending}
              >
                {removeMemberMutation.isPending
                  ? "Removing..."
                  : memberToRemove === currentUserId
                    ? "Leave Team"
                    : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Page>
  );
}
