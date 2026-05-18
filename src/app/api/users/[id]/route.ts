import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  role: z.enum(["SUPER_ADMIN", "MODERATOR", "AUTHOR", "BUYER"]).optional(),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED", "BANNED"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;

    // Admin can view anyone, regular users can only view themselves
    if (
      currentUser.role !== "SUPER_ADMIN" &&
      currentUser.role !== "MODERATOR" &&
      currentUser.id !== id
    ) {
      return apiError("Access denied", 403, "FORBIDDEN");
    }

    const user = await db.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      return apiError("User not found", 404, "NOT_FOUND");
    }

    const sanitized = {
      ...user,
      passwordHash: undefined,
      profile: user.profile
        ? {
            ...user.profile,
            skills: JSON.parse(user.profile.skills || "[]"),
            portfolioImages: JSON.parse(user.profile.portfolioImages || "[]"),
            socialLinks: JSON.parse(user.profile.socialLinks || "{}"),
          }
        : null,
    };

    return apiResponse(sanitized);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get user error:", error);
    return apiError("Failed to fetch user", 500, "INTERNAL_ERROR");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const validated = validateBody(updateUserSchema, body);

    if (validated instanceof Response) return validated;

    // Check permissions
    const isSelf = currentUser.id === id;
    const isAdmin = currentUser.role === "SUPER_ADMIN";

    if (!isSelf && !isAdmin) {
      return apiError("Access denied", 403, "FORBIDDEN");
    }

    // Non-admins cannot update role or status
    if (!isAdmin && (validated.role !== undefined || validated.status !== undefined)) {
      return apiError("You cannot update role or status", 403, "FORBIDDEN");
    }

    // Check user exists
    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return apiError("User not found", 404, "NOT_FOUND");
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.avatarUrl !== undefined) updateData.avatarUrl = validated.avatarUrl || null;
    if (validated.role !== undefined) updateData.role = validated.role;
    if (validated.status !== undefined) updateData.status = validated.status;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: { profile: true },
    });

    // Create audit log for role/status changes
    if (validated.role !== undefined || validated.status !== undefined) {
      await db.auditLog.create({
        data: {
          actorId: currentUser.id,
          action: validated.role !== undefined ? "USER_ROLE_UPDATE" : "USER_STATUS_UPDATE",
          targetId: id,
          targetType: "User",
          metadata: JSON.stringify({
            previousRole: existingUser.role,
            newRole: validated.role,
            previousStatus: existingUser.status,
            newStatus: validated.status,
          }),
        },
      });
    }

    const sanitized = {
      ...updatedUser,
      passwordHash: undefined,
      profile: updatedUser.profile
        ? {
            ...updatedUser.profile,
            skills: JSON.parse(updatedUser.profile.skills || "[]"),
            portfolioImages: JSON.parse(updatedUser.profile.portfolioImages || "[]"),
            socialLinks: JSON.parse(updatedUser.profile.socialLinks || "{}"),
          }
        : null,
    };

    return apiResponse(sanitized);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update user error:", error);
    return apiError("Failed to update user", 500, "INTERNAL_ERROR");
  }
}
