import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const updatePayoutSchema = z.object({
  status: z.enum(["APPROVED", "DENIED", "COMPLETED"]),
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const validated = validateBody(updatePayoutSchema, body);

    if (validated instanceof Response) return validated;

    const payout = await db.payout.findUnique({ where: { id } });
    if (!payout) {
      return apiError("Payout not found", 404, "NOT_FOUND");
    }

    if (payout.status !== "PENDING" && validated.status === "APPROVED") {
      return apiError("Can only approve pending payouts", 400, "INVALID_STATUS");
    }

    const updatedPayout = await db.payout.update({
      where: { id },
      data: {
        status: validated.status,
        adminNote: validated.adminNote,
        processedAt: validated.status !== "PENDING" ? new Date() : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: `PAYOUT_${validated.status}`,
        targetId: id,
        targetType: "Payout",
        metadata: JSON.stringify({
          amount: payout.amount,
          previousStatus: payout.status,
          newStatus: validated.status,
          adminNote: validated.adminNote,
        }),
      },
    });

    // Notify the user
    const statusMessages: Record<string, string> = {
      APPROVED: "Your payout has been approved and is being processed.",
      DENIED: "Your payout request has been denied.",
      COMPLETED: "Your payout has been completed.",
    };

    await db.notification.create({
      data: {
        userId: payout.userId,
        type: "PAYOUT_UPDATE",
        title: "Payout Update",
        message: statusMessages[validated.status] + (validated.adminNote ? ` Note: ${validated.adminNote}` : ""),
        link: `/payouts/${id}`,
      },
    });

    return apiResponse(updatedPayout);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update payout error:", error);
    return apiError("Failed to update payout", 500, "INTERNAL_ERROR");
  }
}
