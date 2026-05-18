import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"], {
    errorMap: () => ({ message: "Status must be ACTIVE, SUSPENDED, or BANNED" }),
  }),
  reason: z.string().min(1, "Reason is required").max(500),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN", "MODERATOR"]);
    const { id } = await params;
    const body = await request.json();
    const validated = validateBody(updateStatusSchema, body);

    if (validated instanceof Response) return validated;

    // Moderators cannot ban users - only admins can
    if (validated.status === "BANNED" && currentUser.role === "MODERATOR") {
      return apiError("Only admins can ban users", 403, "FORBIDDEN");
    }

    // Prevent self-status change
    if (currentUser.id === id) {
      return apiError("You cannot change your own status", 400, "INVALID_OPERATION");
    }

    // Check user exists
    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return apiError("User not found", 404, "NOT_FOUND");
    }

    // Moderators cannot modify admin accounts
    if (
      currentUser.role === "MODERATOR" &&
      (existingUser.role === "SUPER_ADMIN" || existingUser.role === "MODERATOR")
    ) {
      return apiError("You cannot modify this user's status", 403, "FORBIDDEN");
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { status: validated.status },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: "USER_STATUS_UPDATE",
        targetId: id,
        targetType: "User",
        metadata: JSON.stringify({
          previousStatus: existingUser.status,
          newStatus: validated.status,
          reason: validated.reason,
        }),
      },
    });

    // Create notification for the affected user
    const statusMessages: Record<string, string> = {
      ACTIVE: "Your account has been reactivated.",
      SUSPENDED: "Your account has been suspended.",
      BANNED: "Your account has been banned.",
    };

    await db.notification.create({
      data: {
        userId: id,
        type: "ACCOUNT_UPDATE",
        title: "Account Status Updated",
        message: `${statusMessages[validated.status]} Reason: ${validated.reason}`,
      },
    });

    return apiResponse({
      id: updatedUser.id,
      name: updatedUser.name,
      status: updatedUser.status,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update status error:", error);
    return apiError("Failed to update user status", 500, "INTERNAL_ERROR");
  }
}
