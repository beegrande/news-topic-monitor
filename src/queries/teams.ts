import { queryOptions } from "@tanstack/react-query";
import {
  getUserTeamsFn,
  getTeamByIdFn,
  getTeamMembersFn,
  getTeamInvitationsFn,
  getPendingInvitationsFn,
  getTeamTopicsFn,
} from "~/fn/teams";

export const getUserTeamsQuery = () =>
  queryOptions({
    queryKey: ["user-teams"],
    queryFn: () => getUserTeamsFn(),
  });

export const getTeamByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["team", id],
    queryFn: () => getTeamByIdFn({ data: { id } }),
  });

export const getTeamMembersQuery = (teamId: string) =>
  queryOptions({
    queryKey: ["team-members", teamId],
    queryFn: () => getTeamMembersFn({ data: { teamId } }),
  });

export const getTeamInvitationsQuery = (teamId: string) =>
  queryOptions({
    queryKey: ["team-invitations", teamId],
    queryFn: () => getTeamInvitationsFn({ data: { teamId } }),
  });

export const getPendingInvitationsQuery = () =>
  queryOptions({
    queryKey: ["pending-invitations"],
    queryFn: () => getPendingInvitationsFn(),
  });

export const getTeamTopicsQuery = (teamId: string) =>
  queryOptions({
    queryKey: ["team-topics", teamId],
    queryFn: () => getTeamTopicsFn({ data: { teamId } }),
  });
