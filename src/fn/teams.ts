import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  findTeamById,
  findTeamsByUserId,
  findTeamWithDetails,
  createTeam,
  updateTeam,
  deleteTeam,
  findTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  isTeamMember,
  getTeamMemberRole,
  createInvitation,
  findInvitationById,
  findPendingInvitationsByEmail,
  findTeamInvitations,
  updateInvitationStatus,
  deleteInvitation,
  findTeamTopics,
  shareTopicWithTeam,
  unshareTopicFromTeam,
  addTopicCollaborator,
  removeTopicCollaborator,
  findTopicCollaborators,
  canAccessTopic,
} from "~/data-access/teams";
import { findTopicById, checkTopicOwnership } from "~/data-access/topics";
import { findUserByEmail } from "~/data-access/users";

// Team CRUD operations
export const getUserTeamsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await findTeamsByUserId(context.userId);
  });

export const getTeamByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const isMember = await isTeamMember(data.id, context.userId);
    if (!isMember) {
      throw new Error("Unauthorized: You are not a member of this team");
    }

    const team = await findTeamWithDetails(data.id);
    if (!team) {
      throw new Error("Team not found");
    }

    return team;
  });

export const createTeamFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      name: z.string().min(2).max(100),
      description: z.string().max(500).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const teamId = crypto.randomUUID();

    // Create the team
    const newTeam = await createTeam({
      id: teamId,
      name: data.name,
      description: data.description || null,
      createdBy: context.userId,
    });

    // Add the creator as owner
    await addTeamMember({
      id: crypto.randomUUID(),
      teamId: teamId,
      userId: context.userId,
      role: "owner",
    });

    return newTeam;
  });

export const updateTeamFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;

    const role = await getTeamMemberRole(id, context.userId);
    if (!role || (role !== "owner" && role !== "admin")) {
      throw new Error("Unauthorized: Only owners and admins can update team settings");
    }

    const updatedTeam = await updateTeam(id, updateData);
    if (!updatedTeam) {
      throw new Error("Failed to update team");
    }

    return updatedTeam;
  });

export const deleteTeamFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const role = await getTeamMemberRole(data.id, context.userId);
    if (role !== "owner") {
      throw new Error("Unauthorized: Only the owner can delete a team");
    }

    const deleted = await deleteTeam(data.id);
    if (!deleted) {
      throw new Error("Failed to delete team");
    }

    return { success: true };
  });

// Team member operations
export const getTeamMembersFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ teamId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const isMember = await isTeamMember(data.teamId, context.userId);
    if (!isMember) {
      throw new Error("Unauthorized: You are not a member of this team");
    }

    return await findTeamMembers(data.teamId);
  });

export const removeMemberFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      teamId: z.string(),
      userId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const myRole = await getTeamMemberRole(data.teamId, context.userId);
    const targetRole = await getTeamMemberRole(data.teamId, data.userId);

    // Users can remove themselves
    if (data.userId !== context.userId) {
      // Otherwise need to be owner/admin
      if (!myRole || (myRole !== "owner" && myRole !== "admin")) {
        throw new Error("Unauthorized: Only owners and admins can remove members");
      }
      // Admins can't remove owners
      if (myRole === "admin" && targetRole === "owner") {
        throw new Error("Unauthorized: Admins cannot remove owners");
      }
    }

    // Owners can't leave if they're the only owner
    if (data.userId === context.userId && myRole === "owner") {
      const members = await findTeamMembers(data.teamId);
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount === 1) {
        throw new Error("Cannot leave team: You are the only owner. Transfer ownership first.");
      }
    }

    const removed = await removeTeamMember(data.teamId, data.userId);
    if (!removed) {
      throw new Error("Failed to remove member");
    }

    return { success: true };
  });

export const updateMemberRoleFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      teamId: z.string(),
      userId: z.string(),
      role: z.enum(["owner", "admin", "member"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const myRole = await getTeamMemberRole(data.teamId, context.userId);

    if (myRole !== "owner") {
      throw new Error("Unauthorized: Only owners can change member roles");
    }

    // Can't demote yourself if you're the only owner
    if (data.userId === context.userId && data.role !== "owner") {
      const members = await findTeamMembers(data.teamId);
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount === 1) {
        throw new Error("Cannot change role: You are the only owner");
      }
    }

    const updated = await updateMemberRole(data.teamId, data.userId, data.role);
    if (!updated) {
      throw new Error("Failed to update member role");
    }

    return updated;
  });

// Invitation operations
export const inviteMemberFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      teamId: z.string(),
      email: z.string().email(),
      role: z.enum(["admin", "member"]).default("member"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const myRole = await getTeamMemberRole(data.teamId, context.userId);
    if (!myRole || (myRole !== "owner" && myRole !== "admin")) {
      throw new Error("Unauthorized: Only owners and admins can invite members");
    }

    // Check if user is already a member
    const existingUser = await findUserByEmail(data.email);
    if (existingUser) {
      const alreadyMember = await isTeamMember(data.teamId, existingUser.id);
      if (alreadyMember) {
        throw new Error("User is already a member of this team");
      }
    }

    // Create invitation (expires in 7 days)
    const invitation = await createInvitation({
      id: crypto.randomUUID(),
      teamId: data.teamId,
      email: data.email,
      role: data.role,
      invitedBy: context.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return invitation;
  });

export const getPendingInvitationsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    // Get user's email to find their pending invitations
    const { findUserById } = await import("~/data-access/users");
    const user = await findUserById(context.userId);
    if (!user) {
      throw new Error("User not found");
    }

    return await findPendingInvitationsByEmail(user.email);
  });

export const getTeamInvitationsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ teamId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const role = await getTeamMemberRole(data.teamId, context.userId);
    if (!role || (role !== "owner" && role !== "admin")) {
      throw new Error("Unauthorized: Only owners and admins can view invitations");
    }

    return await findTeamInvitations(data.teamId);
  });

export const acceptInvitationFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ invitationId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const invitation = await findInvitationById(data.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer valid");
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error("Invitation has expired");
    }

    // Verify the invitation is for this user
    const { findUserById } = await import("~/data-access/users");
    const user = await findUserById(context.userId);
    if (!user || user.email !== invitation.email) {
      throw new Error("This invitation is not for you");
    }

    // Add user to team
    await addTeamMember({
      id: crypto.randomUUID(),
      teamId: invitation.teamId,
      userId: context.userId,
      role: invitation.role,
    });

    // Mark invitation as accepted
    await updateInvitationStatus(data.invitationId, "accepted");

    return { success: true };
  });

export const declineInvitationFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ invitationId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const invitation = await findInvitationById(data.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify the invitation is for this user
    const { findUserById } = await import("~/data-access/users");
    const user = await findUserById(context.userId);
    if (!user || user.email !== invitation.email) {
      throw new Error("This invitation is not for you");
    }

    await updateInvitationStatus(data.invitationId, "declined");

    return { success: true };
  });

export const cancelInvitationFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ invitationId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const invitation = await findInvitationById(data.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    const role = await getTeamMemberRole(invitation.teamId, context.userId);
    if (!role || (role !== "owner" && role !== "admin")) {
      throw new Error("Unauthorized: Only owners and admins can cancel invitations");
    }

    await deleteInvitation(data.invitationId);

    return { success: true };
  });

// Team topic operations
export const getTeamTopicsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ teamId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const isMember = await isTeamMember(data.teamId, context.userId);
    if (!isMember) {
      throw new Error("Unauthorized: You are not a member of this team");
    }

    return await findTeamTopics(data.teamId);
  });

export const shareTopicWithTeamFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      topicId: z.string(),
      teamId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user owns the topic
    const isOwner = await checkTopicOwnership(data.topicId, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only share your own topics");
    }

    // Verify user is a member of the team
    const isMember = await isTeamMember(data.teamId, context.userId);
    if (!isMember) {
      throw new Error("Unauthorized: You are not a member of this team");
    }

    const updated = await shareTopicWithTeam(data.topicId, data.teamId);
    if (!updated) {
      throw new Error("Failed to share topic with team");
    }

    return updated;
  });

export const unshareTopicFromTeamFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ topicId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user owns the topic
    const isOwner = await checkTopicOwnership(data.topicId, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only unshare your own topics");
    }

    const updated = await unshareTopicFromTeam(data.topicId);
    if (!updated) {
      throw new Error("Failed to unshare topic from team");
    }

    return updated;
  });

// Topic collaborator operations
export const addCollaboratorFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      topicId: z.string(),
      email: z.string().email(),
      permission: z.enum(["view", "edit"]).default("view"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user owns the topic
    const isOwner = await checkTopicOwnership(data.topicId, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only add collaborators to your own topics");
    }

    // Find the user by email
    const targetUser = await findUserByEmail(data.email);
    if (!targetUser) {
      throw new Error("User not found with that email");
    }

    // Can't add yourself
    if (targetUser.id === context.userId) {
      throw new Error("You cannot add yourself as a collaborator");
    }

    const collaborator = await addTopicCollaborator({
      id: crypto.randomUUID(),
      topicId: data.topicId,
      userId: targetUser.id,
      permission: data.permission,
    });

    return collaborator;
  });

export const removeCollaboratorFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      topicId: z.string(),
      userId: z.string(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user owns the topic
    const isOwner = await checkTopicOwnership(data.topicId, context.userId);
    if (!isOwner) {
      throw new Error("Unauthorized: You can only remove collaborators from your own topics");
    }

    const removed = await removeTopicCollaborator(data.topicId, data.userId);
    if (!removed) {
      throw new Error("Failed to remove collaborator");
    }

    return { success: true };
  });

export const getTopicCollaboratorsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ topicId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const hasAccess = await canAccessTopic(data.topicId, context.userId);
    if (!hasAccess) {
      throw new Error("Unauthorized: You do not have access to this topic");
    }

    return await findTopicCollaborators(data.topicId);
  });
