import { eq, and, desc, sql, or } from "drizzle-orm";
import { database } from "~/db";
import {
  team,
  teamMember,
  teamInvitation,
  topic,
  topicCollaborator,
  user,
  type Team,
  type TeamMember,
  type TeamInvitation,
  type CreateTeamData,
  type CreateTeamMemberData,
  type CreateTeamInvitationData,
  type UpdateTeamData,
  type TeamRole,
  type Topic,
  type TopicCollaborator,
  type CreateTopicCollaboratorData,
} from "~/db/schema";

export type TeamWithMemberCount = Team & {
  memberCount: number;
};

export type TeamMemberWithUser = TeamMember & {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export type TeamWithDetails = Team & {
  memberCount: number;
  topicCount: number;
};

// Team CRUD operations
export async function findTeamById(id: string): Promise<Team | null> {
  const [result] = await database
    .select()
    .from(team)
    .where(eq(team.id, id))
    .limit(1);

  return result || null;
}

export async function createTeam(teamData: CreateTeamData): Promise<Team> {
  const [newTeam] = await database
    .insert(team)
    .values({
      ...teamData,
      updatedAt: new Date(),
    })
    .returning();

  return newTeam;
}

export async function updateTeam(
  id: string,
  teamData: UpdateTeamData
): Promise<Team | null> {
  const [updatedTeam] = await database
    .update(team)
    .set({
      ...teamData,
      updatedAt: new Date(),
    })
    .where(eq(team.id, id))
    .returning();

  return updatedTeam || null;
}

export async function deleteTeam(id: string): Promise<boolean> {
  const result = await database
    .delete(team)
    .where(eq(team.id, id))
    .returning();

  return result.length > 0;
}

// Team member operations
export async function findTeamsByUserId(userId: string): Promise<TeamWithMemberCount[]> {
  const memberships = await database
    .select({
      teamId: teamMember.teamId,
    })
    .from(teamMember)
    .where(eq(teamMember.userId, userId));

  if (memberships.length === 0) {
    return [];
  }

  const teamIds = memberships.map((m) => m.teamId);

  const teams = await Promise.all(
    teamIds.map(async (teamId) => {
      const [teamResult] = await database
        .select()
        .from(team)
        .where(eq(team.id, teamId))
        .limit(1);

      const [countResult] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(teamMember)
        .where(eq(teamMember.teamId, teamId));

      return {
        ...teamResult,
        memberCount: countResult?.count ?? 0,
      };
    })
  );

  return teams.filter((t) => t.id);
}

export async function findTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
  const members = await database
    .select({
      id: teamMember.id,
      teamId: teamMember.teamId,
      userId: teamMember.userId,
      role: teamMember.role,
      joinedAt: teamMember.joinedAt,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(teamMember)
    .innerJoin(user, eq(teamMember.userId, user.id))
    .where(eq(teamMember.teamId, teamId))
    .orderBy(desc(teamMember.joinedAt));

  return members.map((m) => ({
    id: m.id,
    teamId: m.teamId,
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    user: {
      id: m.userId,
      name: m.userName,
      email: m.userEmail,
      image: m.userImage,
    },
  }));
}

export async function addTeamMember(
  memberData: CreateTeamMemberData
): Promise<TeamMember> {
  const [newMember] = await database
    .insert(teamMember)
    .values(memberData)
    .returning();

  return newMember;
}

export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<boolean> {
  const result = await database
    .delete(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .returning();

  return result.length > 0;
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: TeamRole
): Promise<TeamMember | null> {
  const [updated] = await database
    .update(teamMember)
    .set({ role })
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .returning();

  return updated || null;
}

export async function isTeamMember(
  teamId: string,
  userId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .limit(1);

  return !!result;
}

export async function getTeamMemberRole(
  teamId: string,
  userId: string
): Promise<TeamRole | null> {
  const [result] = await database
    .select({ role: teamMember.role })
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .limit(1);

  return (result?.role as TeamRole) || null;
}

// Team invitation operations
export async function createInvitation(
  invitationData: CreateTeamInvitationData
): Promise<TeamInvitation> {
  const [newInvitation] = await database
    .insert(teamInvitation)
    .values(invitationData)
    .returning();

  return newInvitation;
}

export async function findInvitationById(
  id: string
): Promise<TeamInvitation | null> {
  const [result] = await database
    .select()
    .from(teamInvitation)
    .where(eq(teamInvitation.id, id))
    .limit(1);

  return result || null;
}

export async function findPendingInvitationsByEmail(
  email: string
): Promise<(TeamInvitation & { teamName: string })[]> {
  const invitations = await database
    .select({
      id: teamInvitation.id,
      teamId: teamInvitation.teamId,
      email: teamInvitation.email,
      role: teamInvitation.role,
      invitedBy: teamInvitation.invitedBy,
      status: teamInvitation.status,
      expiresAt: teamInvitation.expiresAt,
      createdAt: teamInvitation.createdAt,
      teamName: team.name,
    })
    .from(teamInvitation)
    .innerJoin(team, eq(teamInvitation.teamId, team.id))
    .where(
      and(
        eq(teamInvitation.email, email),
        eq(teamInvitation.status, "pending")
      )
    )
    .orderBy(desc(teamInvitation.createdAt));

  return invitations.map((inv) => ({
    id: inv.id,
    teamId: inv.teamId,
    email: inv.email,
    role: inv.role,
    invitedBy: inv.invitedBy,
    status: inv.status,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
    teamName: inv.teamName,
  }));
}

export async function findTeamInvitations(
  teamId: string
): Promise<TeamInvitation[]> {
  return await database
    .select()
    .from(teamInvitation)
    .where(eq(teamInvitation.teamId, teamId))
    .orderBy(desc(teamInvitation.createdAt));
}

export async function updateInvitationStatus(
  id: string,
  status: "accepted" | "declined"
): Promise<TeamInvitation | null> {
  const [updated] = await database
    .update(teamInvitation)
    .set({ status })
    .where(eq(teamInvitation.id, id))
    .returning();

  return updated || null;
}

export async function deleteInvitation(id: string): Promise<boolean> {
  const result = await database
    .delete(teamInvitation)
    .where(eq(teamInvitation.id, id))
    .returning();

  return result.length > 0;
}

// Team topic operations
export async function findTeamTopics(teamId: string): Promise<Topic[]> {
  return await database
    .select()
    .from(topic)
    .where(eq(topic.teamId, teamId))
    .orderBy(desc(topic.createdAt));
}

export async function countTeamTopics(teamId: string): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(topic)
    .where(eq(topic.teamId, teamId));

  return result?.count ?? 0;
}

export async function shareTopicWithTeam(
  topicId: string,
  teamId: string
): Promise<Topic | null> {
  const [updated] = await database
    .update(topic)
    .set({ teamId, updatedAt: new Date() })
    .where(eq(topic.id, topicId))
    .returning();

  return updated || null;
}

export async function unshareTopicFromTeam(topicId: string): Promise<Topic | null> {
  const [updated] = await database
    .update(topic)
    .set({ teamId: null, updatedAt: new Date() })
    .where(eq(topic.id, topicId))
    .returning();

  return updated || null;
}

// Topic collaborator operations
export async function addTopicCollaborator(
  collaboratorData: CreateTopicCollaboratorData
): Promise<TopicCollaborator> {
  const [newCollaborator] = await database
    .insert(topicCollaborator)
    .values(collaboratorData)
    .returning();

  return newCollaborator;
}

export async function removeTopicCollaborator(
  topicId: string,
  userId: string
): Promise<boolean> {
  const result = await database
    .delete(topicCollaborator)
    .where(
      and(
        eq(topicCollaborator.topicId, topicId),
        eq(topicCollaborator.userId, userId)
      )
    )
    .returning();

  return result.length > 0;
}

export async function findTopicCollaborators(
  topicId: string
): Promise<(TopicCollaborator & { user: { id: string; name: string; email: string; image: string | null } })[]> {
  const collaborators = await database
    .select({
      id: topicCollaborator.id,
      topicId: topicCollaborator.topicId,
      userId: topicCollaborator.userId,
      permission: topicCollaborator.permission,
      addedAt: topicCollaborator.addedAt,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(topicCollaborator)
    .innerJoin(user, eq(topicCollaborator.userId, user.id))
    .where(eq(topicCollaborator.topicId, topicId));

  return collaborators.map((c) => ({
    id: c.id,
    topicId: c.topicId,
    userId: c.userId,
    permission: c.permission,
    addedAt: c.addedAt,
    user: {
      id: c.userId,
      name: c.userName,
      email: c.userEmail,
      image: c.userImage,
    },
  }));
}

export async function isTopicCollaborator(
  topicId: string,
  userId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: topicCollaborator.id })
    .from(topicCollaborator)
    .where(
      and(
        eq(topicCollaborator.topicId, topicId),
        eq(topicCollaborator.userId, userId)
      )
    )
    .limit(1);

  return !!result;
}

export async function getTopicCollaboratorPermission(
  topicId: string,
  userId: string
): Promise<"view" | "edit" | null> {
  const [result] = await database
    .select({ permission: topicCollaborator.permission })
    .from(topicCollaborator)
    .where(
      and(
        eq(topicCollaborator.topicId, topicId),
        eq(topicCollaborator.userId, userId)
      )
    )
    .limit(1);

  return (result?.permission as "view" | "edit") || null;
}

// Check if user can access a topic (owner, team member, or collaborator)
export async function canAccessTopic(
  topicId: string,
  userId: string
): Promise<boolean> {
  // Check if user is owner
  const [ownerResult] = await database
    .select({ id: topic.id })
    .from(topic)
    .where(and(eq(topic.id, topicId), eq(topic.userId, userId)))
    .limit(1);

  if (ownerResult) return true;

  // Check if topic is shared with a team the user is in
  const [topicResult] = await database
    .select({ teamId: topic.teamId })
    .from(topic)
    .where(eq(topic.id, topicId))
    .limit(1);

  if (topicResult?.teamId) {
    const isMember = await isTeamMember(topicResult.teamId, userId);
    if (isMember) return true;
  }

  // Check if user is a collaborator
  return await isTopicCollaborator(topicId, userId);
}

// Get team details with counts
export async function findTeamWithDetails(
  teamId: string
): Promise<TeamWithDetails | null> {
  const [teamResult] = await database
    .select()
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1);

  if (!teamResult) return null;

  const [memberCount] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId));

  const [topicCount] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(topic)
    .where(eq(topic.teamId, teamId));

  return {
    ...teamResult,
    memberCount: memberCount?.count ?? 0,
    topicCount: topicCount?.count ?? 0,
  };
}
