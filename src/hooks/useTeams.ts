import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createTeamFn,
  updateTeamFn,
  deleteTeamFn,
  removeMemberFn,
  updateMemberRoleFn,
  inviteMemberFn,
  acceptInvitationFn,
  declineInvitationFn,
  cancelInvitationFn,
  shareTopicWithTeamFn,
  unshareTopicFromTeamFn,
} from "~/fn/teams";
import {
  getUserTeamsQuery,
  getTeamByIdQuery,
  getTeamMembersQuery,
  getTeamInvitationsQuery,
  getPendingInvitationsQuery,
  getTeamTopicsQuery,
} from "~/queries/teams";
import { getErrorMessage } from "~/utils/error";
import { authClient } from "~/lib/auth-client";

// Query hooks
export function useTeams(enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getUserTeamsQuery(),
    enabled: enabled && !!session?.user,
  });
}

export function useTeamById(id: string, enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getTeamByIdQuery(id),
    enabled: enabled && !!id && !!session?.user,
  });
}

export function useTeamMembers(teamId: string, enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getTeamMembersQuery(teamId),
    enabled: enabled && !!teamId && !!session?.user,
  });
}

export function useTeamInvitations(teamId: string, enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getTeamInvitationsQuery(teamId),
    enabled: enabled && !!teamId && !!session?.user,
  });
}

export function usePendingInvitations(enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getPendingInvitationsQuery(),
    enabled: enabled && !!session?.user,
  });
}

export function useTeamTopics(teamId: string, enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getTeamTopicsQuery(teamId),
    enabled: enabled && !!teamId && !!session?.user,
  });
}

// Mutation hooks
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      createTeamFn({ data }),
    onSuccess: () => {
      toast.success("Team created successfully!", {
        description: "You can now invite members to your team.",
      });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
    onError: (error) => {
      toast.error("Failed to create team", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; name?: string; description?: string }) =>
      updateTeamFn({ data }),
    onSuccess: (team) => {
      toast.success("Team updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["team", team.id] });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
    onError: (error) => {
      toast.error("Failed to update team", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTeamFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Team deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
    onError: (error) => {
      toast.error("Failed to delete team", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { teamId: string; userId: string }) =>
      removeMemberFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["team-members", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["team", variables.teamId] });
    },
    onError: (error) => {
      toast.error("Failed to remove member", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { teamId: string; userId: string; role: "owner" | "admin" | "member" }) =>
      updateMemberRoleFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Member role updated");
      queryClient.invalidateQueries({ queryKey: ["team-members", variables.teamId] });
    },
    onError: (error) => {
      toast.error("Failed to update member role", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { teamId: string; email: string; role?: "admin" | "member" }) =>
      inviteMemberFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Invitation sent!", {
        description: `An invitation has been sent to ${variables.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["team-invitations", variables.teamId] });
    },
    onError: (error) => {
      toast.error("Failed to send invitation", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => acceptInvitationFn({ data: { invitationId } }),
    onSuccess: () => {
      toast.success("Invitation accepted!", {
        description: "You are now a member of the team.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
    },
    onError: (error) => {
      toast.error("Failed to accept invitation", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => declineInvitationFn({ data: { invitationId } }),
    onSuccess: () => {
      toast.success("Invitation declined");
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
    },
    onError: (error) => {
      toast.error("Failed to decline invitation", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => cancelInvitationFn({ data: { invitationId } }),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
    },
    onError: (error) => {
      toast.error("Failed to cancel invitation", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useShareTopicWithTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { topicId: string; teamId: string }) =>
      shareTopicWithTeamFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Topic shared with team");
      queryClient.invalidateQueries({ queryKey: ["team-topics", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
      queryClient.invalidateQueries({ queryKey: ["topic", variables.topicId] });
    },
    onError: (error) => {
      toast.error("Failed to share topic", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUnshareTopicFromTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topicId: string) => unshareTopicFromTeamFn({ data: { topicId } }),
    onSuccess: (topic) => {
      toast.success("Topic unshared from team");
      queryClient.invalidateQueries({ queryKey: ["team-topics"] });
      queryClient.invalidateQueries({ queryKey: ["user-topics"] });
      queryClient.invalidateQueries({ queryKey: ["topic", topic.id] });
    },
    onError: (error) => {
      toast.error("Failed to unshare topic", {
        description: getErrorMessage(error),
      });
    },
  });
}
