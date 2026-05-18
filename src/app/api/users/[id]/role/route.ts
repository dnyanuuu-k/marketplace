import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const updateRoleSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "MODERATOR", "AUTHOR", "BUYER"], {
    errorMap: () => ({ message: "Invalid role value" }),
  }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const validated = validateBody(updateRoleSchema, body);

    if (validated instanceof Response) return validated;

    // Check user exists
    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return apiError("User not found", 404, "NOT_FOUND");
    }

    // Prevent self-demotion
    if (currentUser.id === id) {
      return apiError("You cannot change your own role", 400, "INVALID_OPERATION");
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { role: validated.role },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: "USER_ROLE_UPDATE",
        targetId: id,
        targetType: "User",
        metadata: JSON.stringify({
          previousRole: existingUser.role,
          newRole: validated.role,
        }),
      },
    });

    return apiResponse({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update role error:", error);
    return apiError("Failed to update user role", 500, "INTERNAL_ERROR");
  }
}
